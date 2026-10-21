begin;

-- Shopping-list purchases. A tick on the shopping list records how much of an
-- item was bought (amount + unit) against the active plan version, so a weekly
-- purchase can reduce the monthly ("plan") total. Rows are owner-readable and
-- written only through the service-only RPCs below.

create table public.shopping_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  plan_version_id uuid not null,
  item_key text not null check (
    char_length(item_key) <= 200
    and item_key ~ '^(ingredient|name):[^[:cntrl:]]*[^[:cntrl:][:space:]][^[:cntrl:]]*$'
  ),
  unit text not null check (unit in ('g', 'ml', 'piece', 'tbsp', 'tsp', 'cup', 'slice', 'serving')),
  amount numeric not null check (amount > 0 and amount <= 100000),
  scope text not null check (scope in ('week', 'plan')),
  local_date date not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint shopping_purchases_plan_version_owned
    foreign key (plan_version_id, user_id)
      references public.plan_versions(id, user_id) on delete cascade
);

create index shopping_purchases_user_plan_version_idx
on public.shopping_purchases(user_id, plan_version_id);

alter table public.shopping_purchases enable row level security;
create policy shopping_purchases_select_own on public.shopping_purchases
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.shopping_purchases from public, anon, authenticated;
grant select on public.shopping_purchases to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.shopping_purchases from service_role;
grant select on public.shopping_purchases to service_role;

comment on table public.shopping_purchases is
  'Owner shopping-list purchases per active plan version. Written only through service-only RPCs; removed with the account.';

-- ---------------------------------------------------------------------------
-- Active plan version for the profile-local day (null when there is no plan).
-- ---------------------------------------------------------------------------
create or replace function private.active_plan_version_for_date(
  p_user_id uuid,
  p_local_date date
)
returns uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select active_version_id
  from public.plans
  where user_id = p_user_id
    and status = 'active'
    and active_version_id is not null
    and p_local_date between valid_from and valid_to
  order by valid_from desc
  limit 1;
$$;

revoke all on function private.active_plan_version_for_date(uuid, date)
from public, anon, authenticated;
grant execute on function private.active_plan_version_for_date(uuid, date)
to service_role;

create or replace function private.shopping_purchase_json(p_row public.shopping_purchases)
returns jsonb
language sql
immutable
set search_path = public, private, pg_temp
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'item_key', p_row.item_key,
    'unit', p_row.unit,
    'amount', p_row.amount,
    'scope', p_row.scope,
    'local_date', p_row.local_date,
    'created_at', p_row.created_at
  );
$$;

revoke all on function private.shopping_purchase_json(public.shopping_purchases)
from public, anon, authenticated;
grant execute on function private.shopping_purchase_json(public.shopping_purchases)
to service_role;

-- ---------------------------------------------------------------------------
-- 1. list_shopping_purchases (active plan version only)
-- ---------------------------------------------------------------------------
create or replace function public.list_shopping_purchases(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_plan_version_id uuid;
begin
  if p_user_id is null then
    raise exception 'invalid_shopping_purchase_arguments' using errcode = '22023';
  end if;

  v_plan_version_id := private.active_plan_version_for_date(
    p_user_id,
    private.current_profile_local_date(p_user_id)
  );
  if v_plan_version_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(private.shopping_purchase_json(sp) order by sp.created_at, sp.id)
    from public.shopping_purchases sp
    where sp.user_id = p_user_id
      and sp.plan_version_id = v_plan_version_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_shopping_purchases(uuid)
from public, anon, authenticated;
grant execute on function public.list_shopping_purchases(uuid)
to service_role;

-- ---------------------------------------------------------------------------
-- 2. record_shopping_purchase (owner + current local_date + active plan)
-- ---------------------------------------------------------------------------
create or replace function public.record_shopping_purchase(
  p_user_id uuid,
  p_item_key text,
  p_unit text,
  p_amount numeric,
  p_scope text,
  p_local_date date,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_plan_version_id uuid;
  v_row public.shopping_purchases%rowtype;
  v_response jsonb;
begin
  if p_user_id is null
    or p_local_date is null
    or p_item_key is null
    or char_length(p_item_key) > 200
    or p_item_key !~ '^(ingredient|name):[^[:cntrl:]]*[^[:cntrl:][:space:]][^[:cntrl:]]*$'
    or p_unit is null
    or p_unit not in ('g', 'ml', 'piece', 'tbsp', 'tsp', 'cup', 'slice', 'serving')
    or p_amount is null
    or p_amount <= 0
    or p_amount > 100000
    or p_scope is null
    or p_scope not in ('week', 'plan')
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_shopping_purchase_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'record-shopping-purchase'
    and idempotency_key = p_idempotency_key;

  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'purchase_date_not_current' using errcode = 'P0001';
  end if;

  v_plan_version_id := private.active_plan_version_for_date(p_user_id, p_local_date);
  if v_plan_version_id is null then
    raise exception 'active_plan_not_found' using errcode = 'P0002';
  end if;

  if (
    select count(*)
    from public.shopping_purchases
    where user_id = p_user_id
      and plan_version_id = v_plan_version_id
  ) >= 5000 then
    raise exception 'shopping_purchase_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.shopping_purchases(
    user_id,
    plan_version_id,
    item_key,
    unit,
    amount,
    scope,
    local_date
  ) values (
    p_user_id,
    v_plan_version_id,
    p_item_key,
    p_unit,
    p_amount,
    p_scope,
    p_local_date
  )
  returning * into v_row;

  v_response := private.shopping_purchase_json(v_row);

  insert into private.account_mutation_keys(
    user_id,
    action,
    idempotency_key,
    request_sha256,
    response_payload
  ) values (
    p_user_id,
    'record-shopping-purchase',
    p_idempotency_key,
    p_request_sha256,
    v_response
  );

  return v_response;
exception
  when unique_violation then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'record-shopping-purchase'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.record_shopping_purchase(uuid, text, text, numeric, text, date, text, text)
from public, anon, authenticated;
grant execute on function public.record_shopping_purchase(uuid, text, text, numeric, text, date, text, text)
to service_role;

-- ---------------------------------------------------------------------------
-- 3. undo_shopping_purchase (owner's own row; idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.undo_shopping_purchase(
  p_user_id uuid,
  p_purchase_id uuid,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_deleted_id uuid;
  v_response jsonb;
begin
  if p_user_id is null
    or p_purchase_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_shopping_purchase_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'undo-shopping-purchase'
    and idempotency_key = p_idempotency_key;

  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  delete from public.shopping_purchases
  where id = p_purchase_id
    and user_id = p_user_id
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'shopping_purchase_not_found' using errcode = 'P0002';
  end if;

  v_response := jsonb_build_object('id', v_deleted_id);

  insert into private.account_mutation_keys(
    user_id,
    action,
    idempotency_key,
    request_sha256,
    response_payload
  ) values (
    p_user_id,
    'undo-shopping-purchase',
    p_idempotency_key,
    p_request_sha256,
    v_response
  );

  return v_response;
exception
  when unique_violation then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'undo-shopping-purchase'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.undo_shopping_purchase(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.undo_shopping_purchase(uuid, uuid, text, text)
to service_role;

-- ---------------------------------------------------------------------------
-- 4. Account deletion also removes shopping purchases.
-- ---------------------------------------------------------------------------
create or replace function public.purge_account_owned_rows(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception 'invalid_purge_arguments' using errcode = '22023';
  end if;

  delete from public.workout_set_logs where user_id = p_user_id;
  delete from public.workout_exercise_logs where user_id = p_user_id;
  delete from public.workout_sessions where user_id = p_user_id;
  delete from public.extra_food_logs where user_id = p_user_id;
  delete from public.shopping_purchases where user_id = p_user_id;
  delete from public.daily_meal_status where user_id = p_user_id;
  delete from public.daily_checkins where user_id = p_user_id;
  delete from public.weekly_checkins where user_id = p_user_id;
  delete from public.next_cycle_inputs where user_id = p_user_id;
  delete from public.monthly_plan_snapshots where user_id = p_user_id;
  delete from public.starter_plan_activations where user_id = p_user_id;
  delete from public.external_plan_imports where user_id = p_user_id;
  delete from public.ai_generation_jobs where user_id = p_user_id;
  delete from public.monthly_plan_periods where user_id = p_user_id;
  delete from public.usage_ledger where user_id = p_user_id;
  delete from public.plan_versions where user_id = p_user_id;
  delete from public.plans where user_id = p_user_id;
  delete from public.gift_reservations where user_id = p_user_id;
  delete from public.ai_safety_reports where user_id = p_user_id;
  delete from public.body_composition_measurements where user_id = p_user_id;
  delete from public.training_schedule_items where user_id = p_user_id;
  delete from public.goals where user_id = p_user_id;
  delete from public.dietary_preferences where user_id = p_user_id;
  delete from public.health_context where user_id = p_user_id;
  delete from public.onboarding_drafts where user_id = p_user_id;
  delete from public.export_requests where user_id = p_user_id;
  delete from public.subscriptions where user_id = p_user_id;
  delete from public.entitlements where user_id = p_user_id;
  delete from private.api_rate_limits where user_id = p_user_id;
  delete from private.account_mutation_keys where user_id = p_user_id;
end;
$$;

commit;
