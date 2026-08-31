begin;

-- Geography selects presentation and payment routing only. It never gates AI,
-- enrollment, the first-plan gift, or product access.

drop function if exists public.admin_verify_ai_country(uuid, text, text);

update public.profiles
set
  ai_billing_country_code = null,
  ai_country_verified_at = null,
  ai_country_verification_method = null
where ai_billing_country_code is not null
   or ai_country_verified_at is not null
   or ai_country_verification_method is not null;

comment on column public.profiles.ai_billing_country_code is
  'Deprecated compatibility field. Country does not gate AI; payment routing uses country_code.';
comment on column public.profiles.ai_country_verified_at is
  'Deprecated compatibility field. Country does not gate AI.';
comment on column public.profiles.ai_country_verification_method is
  'Deprecated compatibility field. Country does not gate AI.';

create or replace function private.clear_legacy_ai_country_gate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  new.ai_billing_country_code := null;
  new.ai_country_verified_at := null;
  new.ai_country_verification_method := null;
  return new;
end;
$$;

drop trigger if exists profiles_clear_legacy_ai_country_gate on public.profiles;
create trigger profiles_clear_legacy_ai_country_gate
before insert or update on public.profiles
for each row execute function private.clear_legacy_ai_country_gate();

alter table public.profiles drop constraint if exists profiles_product_region_source_check;
alter table public.profiles
  add constraint profiles_product_region_source_check
  check (product_region_source in ('ip_at_signup', 'account_country', 'admin'));

create or replace function private.protect_product_region()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  v_country text := upper(trim(coalesce(new.country_code, '')));
begin
  if v_country ~ '^[A-Z]{2}$'
    and (tg_op = 'INSERT' or new.country_code is distinct from old.country_code)
  then
    new.product_region := case when v_country = 'IR' then 'ir' else 'intl' end;
    new.product_region_source := case when tg_op = 'INSERT' then 'ip_at_signup' else 'account_country' end;
    new.product_region_locked_at := statement_timestamp();
  elsif tg_op = 'INSERT' then
    new.product_region := coalesce(new.product_region, case when new.pricing_market = 'ir' then 'ir' else 'intl' end);
    new.product_region_source := coalesce(new.product_region_source, 'ip_at_signup');
    new.product_region_locked_at := coalesce(new.product_region_locked_at, statement_timestamp());
  elsif new.product_region is distinct from old.product_region
    and coalesce(new.product_region_source, '') <> 'admin'
  then
    new.product_region := old.product_region;
    new.product_region_source := old.product_region_source;
    new.product_region_locked_at := old.product_region_locked_at;
  elsif new.product_region is distinct from old.product_region then
    new.product_region_locked_at := statement_timestamp();
  end if;

  new.pricing_market := case when new.product_region = 'ir' then 'ir' else 'global' end;
  return new;
end;
$$;

update public.profiles
set
  product_region = case when upper(country_code) = 'IR' then 'ir' else 'intl' end,
  product_region_source = 'account_country',
  product_region_locked_at = statement_timestamp(),
  pricing_market = case when upper(country_code) = 'IR' then 'ir' else 'global' end
where country_code ~ '^[A-Z]{2}$';

-- Payment recovery affects the next renewal. It must not revoke a gifted,
-- administrator-granted, or already-paid active period.
create or replace function private.payment_method_blocks_paid_generation(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.payment_method_status in ('not_collected', 'pending')
      and not exists (
        select 1
        from public.entitlements e
        where e.user_id = p.user_id
          and e.status = 'active'
          and statement_timestamp() >= e.period_start
          and statement_timestamp() < e.period_end
      )
  );
$$;

revoke all on function private.payment_method_blocks_paid_generation(uuid)
from public, anon, authenticated;

create or replace function public.reserve_first_plan_gift(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_existing public.gift_reservations%rowtype;
  v_entitlement public.entitlements%rowtype;
  v_campaign public.first_plan_campaigns%rowtype;
  v_period_end timestamptz;
begin
  if p_user_id is null then
    raise exception 'invalid_gift_arguments' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where user_id = p_user_id
  for update;
  if v_profile.user_id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if v_profile.onboarding_status = 'automation_blocked' then
    raise exception 'safety_blocked' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.gift_reservations
  where user_id = p_user_id
  for update;
  if v_existing.id is not null then
    return jsonb_build_object(
      'reservation_id', v_existing.id,
      'entitlement_id', v_existing.entitlement_id,
      'status', v_existing.status,
      'idempotent_replay', true
    );
  end if;

  select * into v_entitlement
  from public.entitlements
  where user_id = p_user_id
    and status = 'active'
    and statement_timestamp() >= period_start
    and statement_timestamp() < period_end
  order by period_end desc
  limit 1
  for update;
  if v_entitlement.id is not null then
    return jsonb_build_object(
      'reservation_id', null,
      'entitlement_id', v_entitlement.id,
      'status', 'existing_entitlement',
      'idempotent_replay', true
    );
  end if;

  select * into v_campaign
  from public.first_plan_campaigns
  where enabled
    and (starts_at is null or starts_at <= statement_timestamp())
    and (ends_at is null or ends_at > statement_timestamp())
  order by created_at desc
  limit 1
  for update;
  if v_campaign.id is null
    or v_campaign.remaining_budget_usd - v_campaign.reservation_cost_usd < v_campaign.min_remaining_usd
  then
    raise exception 'gift_budget_unavailable' using errcode = 'P0001';
  end if;

  update public.first_plan_campaigns
  set remaining_budget_usd = remaining_budget_usd - reservation_cost_usd
  where id = v_campaign.id
    and remaining_budget_usd - reservation_cost_usd >= min_remaining_usd
  returning * into v_campaign;
  if not found then
    raise exception 'gift_budget_unavailable' using errcode = 'P0001';
  end if;

  v_period_end := statement_timestamp() + interval '32 days';
  insert into public.entitlements(
    user_id, source, status, period_start, period_end, plan_generation_limit
  ) values (
    p_user_id, 'gift', 'active', statement_timestamp(), v_period_end, 1
  ) returning * into v_entitlement;

  insert into public.gift_reservations(
    campaign_id, user_id, entitlement_id, status, reserved_cost_usd
  ) values (
    v_campaign.id, p_user_id, v_entitlement.id, 'reserved', v_campaign.reservation_cost_usd
  ) returning * into v_existing;

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'gift.reserved',
    'service',
    jsonb_build_object('campaign_id', v_campaign.id, 'entitlement_id', v_entitlement.id)
  );

  return jsonb_build_object(
    'reservation_id', v_existing.id,
    'entitlement_id', v_entitlement.id,
    'status', v_existing.status,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.reserve_first_plan_gift(uuid) from public, anon, authenticated;
grant execute on function public.reserve_first_plan_gift(uuid) to service_role;

alter table public.first_plan_campaigns drop column if exists allowed_markets;

commit;
