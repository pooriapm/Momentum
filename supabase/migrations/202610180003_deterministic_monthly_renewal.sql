begin;

-- The deterministic starter now covers every monthly cycle while AI generation
-- is switched off. A cycle is owned by monthly_plan_periods (one row per user
-- and cycle_index), so the activation table no longer limits a user to one
-- plan per template version.
alter table public.starter_plan_activations
  drop constraint if exists starter_plan_activations_user_template_unique;
create unique index if not exists starter_plan_activations_one_per_version
on public.starter_plan_activations(plan_version_id);

-- Existing starter plans predate their lifecycle period. Give each of them a
-- cycle-1 period so plan history, renewal and next-cycle notes see them.
insert into public.monthly_plan_periods(
  user_id, cycle_index, imported_plan_version_id, status, ready_at, starts_at
)
select a.user_id, 1, a.plan_version_id, 'ready', a.activated_at, a.activated_at
from public.starter_plan_activations a
where not exists (
  select 1 from public.monthly_plan_periods p where p.user_id = a.user_id
)
and a.id = (
  select first.id from public.starter_plan_activations first
  where first.user_id = a.user_id
  order by first.activated_at, first.id
  limit 1
);

create or replace function public.persist_deterministic_starter_plan(
  p_user_id uuid,
  p_idempotency_key text,
  p_goal_id uuid,
  p_plan_name text,
  p_valid_from date,
  p_valid_to date,
  p_locale text,
  p_schema_version text,
  p_catalog_release text,
  p_template_version text,
  p_terms_version text,
  p_privacy_version text,
  p_health_consent_version text,
  p_content jsonb,
  p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_profile public.profiles%rowtype;
  v_latest public.monthly_plan_periods%rowtype;
  v_latest_plan public.plans%rowtype;
  v_active_end date;
  v_cycle integer;
  v_entitlement_id uuid;
  v_valid_from date;
  v_valid_to date;
  v_ready_at timestamptz;
  v_timezone text;
  v_previous_note text;
  v_plan_id uuid;
  v_version_id uuid;
  v_period_id uuid;
  v_activation_id uuid;
  v_now timestamptz := statement_timestamp();
  v_response jsonb;
begin
  if p_user_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or char_length(trim(p_plan_name)) not between 1 and 240
    or p_valid_to < p_valid_from
    or p_valid_to - p_valid_from > 31
    or p_locale not in ('fa-IR', 'en-US')
    or p_schema_version !~ '^1\.[0-9]+\.[0-9]+$'
    or char_length(p_catalog_release) not between 1 and 80
    or char_length(p_template_version) not between 1 and 80
    or char_length(p_terms_version) not between 1 and 80
    or char_length(p_privacy_version) not between 1 and 80
    or char_length(p_health_consent_version) not between 1 and 80
    or jsonb_typeof(p_content) <> 'object'
    or p_content_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_starter_plan' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'create-starter-plan'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_content_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload || jsonb_build_object('idempotent_replay', true);
  end if;

  -- The profile lock serializes concurrent requests for the same user, so two
  -- different keys cannot both create the same cycle.
  select * into v_profile from public.profiles where user_id = p_user_id for update;
  if v_profile.user_id is null
    or v_profile.onboarding_status <> 'complete'
    or v_profile.automation_block_reason is not null
    or v_profile.plan_source_preference <> 'momentum'
    or v_profile.date_of_birth is null
    or date_part('year', age(current_date, v_profile.date_of_birth))::integer not between 18 and 100
    or v_profile.country_code !~ '^[A-Z]{2}$'
    or (v_profile.country_code = 'IR' and v_profile.product_region <> 'ir')
    or (v_profile.country_code <> 'IR' and v_profile.product_region <> 'intl')
    or v_profile.terms_accepted_at is null
    or v_profile.terms_version is distinct from p_terms_version
    or v_profile.privacy_accepted_at is null
    or v_profile.privacy_version is distinct from p_privacy_version
    or v_profile.health_data_consent_at is null
    or v_profile.health_consent_version is distinct from p_health_consent_version
  then
    raise exception 'starter_plan_gate_failed' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.goals
    where id = p_goal_id and user_id = p_user_id and status = 'active'
  ) or not exists (
    select 1 from public.catalog_releases
    where id = p_catalog_release and status = 'active'
  ) then
    raise exception 'starter_plan_gate_failed' using errcode = 'P0001';
  end if;

  v_timezone := coalesce(nullif(v_profile.timezone, ''), 'UTC');

  select * into v_latest
  from public.monthly_plan_periods
  where user_id = p_user_id
  order by cycle_index desc
  limit 1;

  select max(valid_to) into v_active_end
  from public.plans
  where user_id = p_user_id and status = 'active';

  -- p_valid_from is the caller's local "today". The first cycle starts today
  -- and replaces any overlapping plan, as before. A later cycle opens only
  -- when no active plan has more than three days left; otherwise the current
  -- cycle's plan is returned, never an older expired one.
  if v_latest.id is not null
    and v_active_end is not null
    and v_active_end - p_valid_from >= 3
  then
    if v_latest.id is not null
      and v_latest.status = 'ready'
      and v_latest.imported_plan_version_id is not null
    then
      select plan.* into v_latest_plan
      from public.plan_versions version
      join public.plans plan on plan.id = version.plan_id and plan.user_id = version.user_id
      where version.id = v_latest.imported_plan_version_id
        and version.user_id = p_user_id;
      if v_latest_plan.id is not null
        and v_latest_plan.status = 'active'
        and v_latest_plan.valid_to >= p_valid_from
      then
        return jsonb_build_object(
          'activation_id', (
            select id from public.starter_plan_activations
            where plan_version_id = v_latest.imported_plan_version_id
          ),
          'plan_id', v_latest_plan.id,
          'plan_version_id', v_latest.imported_plan_version_id,
          'period_id', v_latest.id,
          'cycle_index', v_latest.cycle_index,
          'valid_from', v_latest_plan.valid_from,
          'valid_to', v_latest_plan.valid_to,
          'activated_at', v_latest.ready_at,
          'idempotent_replay', true
        );
      end if;
    end if;
    raise exception 'plan_already_active' using errcode = 'P0001';
  end if;

  if v_latest.id is null then
    v_cycle := 1;
  elsif v_latest.status = 'ready' then
    v_cycle := v_latest.cycle_index + 1;
  elsif v_latest.status in ('reserved', 'provider_started', 'validating', 'importing') then
    raise exception 'generation_in_progress' using errcode = 'P0001';
  else
    -- An unfinished AI period (draft, awaiting entitlement or failed) is taken
    -- over instead of skipping its cycle number.
    v_cycle := v_latest.cycle_index;
  end if;

  -- A renewal requested in the last days of a plan starts the day after it ends.
  v_valid_from := case
    when v_latest.id is null then p_valid_from
    else greatest(p_valid_from, coalesce(v_active_end + 1, p_valid_from))
  end;
  v_valid_to := v_valid_from + (p_valid_to - p_valid_from);
  v_ready_at := case
    when v_valid_from = p_valid_from then v_now
    else v_valid_from::timestamp at time zone v_timezone
  end;

  -- Same rule as the AI renewal: cycle 1 is free, every later cycle needs a
  -- paid (or admin) membership that is live when the new plan starts.
  if v_cycle >= 2 then
    select e.id into v_entitlement_id
    from public.entitlements e
    where e.user_id = p_user_id
      and e.source in ('subscription', 'admin')
      and e.status = 'active'
      and e.period_end > v_now
      and e.period_start <= greatest(v_now, v_ready_at)
    order by e.period_end desc
    limit 1;
    if v_entitlement_id is null then
      raise exception 'subscription_inactive' using errcode = 'P0001';
    end if;
    if private.payment_method_blocks_paid_generation(p_user_id) then
      raise exception 'payment_method_required' using errcode = 'P0001';
    end if;
  end if;

  if v_latest.id is not null and v_latest.status = 'ready' then
    select note into v_previous_note
    from public.next_cycle_inputs
    where period_id = v_latest.id and user_id = p_user_id;
  end if;

  insert into public.plans(user_id, goal_id, name, status, valid_from, valid_to, locale)
  values (p_user_id, p_goal_id, trim(p_plan_name), 'draft', v_valid_from, v_valid_to, p_locale)
  returning id into v_plan_id;

  insert into public.plan_versions(
    plan_id, user_id, version, schema_version, source, prompt_version, model, content, content_sha256
  ) values (
    v_plan_id, p_user_id, 1, p_schema_version, 'deterministic',
    p_template_version, null, p_content, p_content_sha256
  ) returning id into v_version_id;

  -- Overlapping plans are replaced; plans that already ended are retired so
  -- only the current and the upcoming cycle stay active.
  update public.plans
  set status = 'archived'
  where user_id = p_user_id and id <> v_plan_id and status = 'active'
    and (
      daterange(valid_from, valid_to, '[]') && daterange(v_valid_from, v_valid_to, '[]')
      or valid_to < p_valid_from
    );

  update public.plans
  set active_version_id = v_version_id, status = 'active'
  where id = v_plan_id and user_id = p_user_id;

  if v_latest.id is not null and v_latest.cycle_index = v_cycle then
    update public.monthly_plan_periods
    set status = 'ready',
        entitlement_id = coalesce(v_entitlement_id, entitlement_id),
        imported_plan_version_id = v_version_id,
        ready_at = v_ready_at,
        starts_at = v_ready_at,
        ends_at = null
    where id = v_latest.id and user_id = p_user_id
    returning id into v_period_id;
  else
    insert into public.monthly_plan_periods(
      user_id, cycle_index, entitlement_id, imported_plan_version_id, status, ready_at, starts_at
    ) values (
      p_user_id, v_cycle, v_entitlement_id, v_version_id, 'ready', v_ready_at, v_ready_at
    ) returning id into v_period_id;
  end if;

  insert into public.starter_plan_activations(
    user_id, plan_id, plan_version_id, template_version, schema_version,
    catalog_release, content_sha256
  ) values (
    p_user_id, v_plan_id, v_version_id, p_template_version, p_schema_version,
    p_catalog_release, p_content_sha256
  ) returning id into v_activation_id;

  v_response := jsonb_build_object(
    'activation_id', v_activation_id,
    'plan_id', v_plan_id,
    'plan_version_id', v_version_id,
    'period_id', v_period_id,
    'cycle_index', v_cycle,
    'valid_from', v_valid_from,
    'valid_to', v_valid_to,
    'previous_cycle_note', v_previous_note,
    'activated_at', v_now
  );

  insert into private.account_mutation_keys(
    user_id, action, idempotency_key, request_sha256, response_payload
  ) values (
    p_user_id, 'create-starter-plan', p_idempotency_key, p_content_sha256, v_response
  );

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'plan.deterministic_starter_activated',
    'service',
    jsonb_build_object(
      'plan_id', v_plan_id,
      'plan_version_id', v_version_id,
      'period_id', v_period_id,
      'cycle_index', v_cycle,
      'template_version', p_template_version,
      'catalog_release', p_catalog_release
    )
  );

  return v_response;
end;
$$;

revoke all on function public.persist_deterministic_starter_plan(
  uuid, text, uuid, text, date, date, text, text, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_deterministic_starter_plan(
  uuid, text, uuid, text, date, date, text, text, text, text, text, text, text, jsonb, text
) to service_role;

commit;
