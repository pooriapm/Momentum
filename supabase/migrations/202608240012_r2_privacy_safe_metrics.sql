-- R2.6: optional first-party product measurement. Event rows are deliberately
-- unlinkable to accounts and contain categorical fields only. User-level
-- activation/adherence metrics are computed inside Postgres from protected
-- operational facts and returned only as aggregates.

alter table public.profiles
  add column analytics_consent_at timestamptz,
  add column analytics_consent_version text
    check (analytics_consent_version is null or analytics_consent_version = 'analytics-v1'),
  add column analytics_consent_withdrawn_at timestamptz,
  add constraint profiles_analytics_consent_complete check (
    (analytics_consent_at is null) = (analytics_consent_version is null)
  );

create table public.product_events (
  event_id uuid primary key,
  event_name text not null check (event_name in (
    'onboarding_completed',
    'plan_activated',
    'plan_viewed',
    'meaningful_action_completed',
    'daily_checkin_completed',
    'weekly_checkin_completed'
  )),
  locale text not null check (locale in ('fa', 'en')),
  product_region text check (product_region is null or product_region in ('ir', 'intl')),
  plan_source text check (plan_source is null or plan_source in ('external', 'momentum')),
  surface text not null check (surface in ('onboarding', 'today', 'plan', 'progress')),
  action_kind text check (action_kind is null or action_kind in (
    'plan', 'meal', 'workout', 'daily_checkin', 'weekly_checkin'
  )),
  outcome text not null check (outcome in ('completed', 'activated', 'viewed')),
  schema_version text not null default '1.0.0' check (schema_version = '1.0.0'),
  occurred_at timestamptz not null default statement_timestamp(),
  constraint product_events_shape check (
    (event_name = 'onboarding_completed' and surface = 'onboarding' and action_kind is null and outcome = 'completed')
    or (event_name = 'plan_activated' and surface = 'onboarding' and action_kind = 'plan' and outcome = 'activated')
    or (event_name = 'plan_viewed' and surface in ('today', 'plan') and action_kind = 'plan' and outcome = 'viewed')
    or (event_name = 'meaningful_action_completed' and surface in ('today', 'plan') and action_kind in ('meal', 'workout') and outcome = 'completed')
    or (event_name = 'daily_checkin_completed' and surface = 'today' and action_kind = 'daily_checkin' and outcome = 'completed')
    or (event_name = 'weekly_checkin_completed' and surface = 'progress' and action_kind = 'weekly_checkin' and outcome = 'completed')
  )
);

create index product_events_name_time_idx on public.product_events(event_name, occurred_at);
alter table public.product_events enable row level security;
revoke all on table public.product_events from public, anon, authenticated, service_role;

create or replace function public.set_analytics_consent(
  p_user_id uuid,
  p_enabled boolean,
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
  v_response jsonb;
begin
  if p_user_id is null
    or p_enabled is null
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_analytics_consent_arguments' using errcode = '22023'; end if;

  select * into v_existing from private.account_mutation_keys
  where user_id = p_user_id and action = 'set-analytics-consent'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  if not exists (select 1 from public.profiles where user_id = p_user_id for update) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  update public.profiles set
    analytics_consent_at = case when p_enabled then statement_timestamp() else null end,
    analytics_consent_version = case when p_enabled then 'analytics-v1' else null end,
    analytics_consent_withdrawn_at = case
      when p_enabled then analytics_consent_withdrawn_at
      else statement_timestamp()
    end
  where user_id = p_user_id;

  v_response := jsonb_build_object(
    'enabled', p_enabled,
    'version', case when p_enabled then 'analytics-v1' else null end
  );
  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (p_user_id, 'consent.analytics_updated', 'service', jsonb_build_object('enabled', p_enabled));
  insert into private.account_mutation_keys(user_id, action, idempotency_key, request_sha256, response_payload)
  values (p_user_id, 'set-analytics-consent', p_idempotency_key, p_request_sha256, v_response);
  return v_response;
exception
  when unique_violation then
    select * into v_existing from private.account_mutation_keys
    where user_id = p_user_id and action = 'set-analytics-consent'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then return v_existing.response_payload; end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.set_analytics_consent(uuid, boolean, text, text)
from public, anon, authenticated;
grant execute on function public.set_analytics_consent(uuid, boolean, text, text) to service_role;

create or replace function public.record_product_event(
  p_user_id uuid,
  p_event_id uuid,
  p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_allowed_keys constant text[] := array[
    'event_name', 'locale', 'product_region', 'plan_source',
    'surface', 'action_kind', 'outcome', 'schema_version'
  ];
begin
  if p_user_id is null or p_event_id is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'invalid_product_event' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_event) key where not (key = any(v_allowed_keys)))
    or (select count(*) from jsonb_object_keys(p_event)) <> 8
  then raise exception 'invalid_product_event' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.profiles
    where user_id = p_user_id
      and analytics_consent_at is not null
      and analytics_consent_version = 'analytics-v1'
  ) then raise exception 'analytics_consent_required' using errcode = '42501'; end if;

  insert into public.product_events(
    event_id, event_name, locale, product_region, plan_source,
    surface, action_kind, outcome, schema_version
  ) values (
    p_event_id,
    p_event ->> 'event_name',
    p_event ->> 'locale',
    nullif(p_event ->> 'product_region', ''),
    nullif(p_event ->> 'plan_source', ''),
    p_event ->> 'surface',
    nullif(p_event ->> 'action_kind', ''),
    p_event ->> 'outcome',
    p_event ->> 'schema_version'
  ) on conflict (event_id) do nothing;
  return '{"accepted":true}'::jsonb;
end;
$$;

revoke all on function public.record_product_event(uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.record_product_event(uuid, uuid, jsonb) to service_role;

create or replace function public.r2_core_metrics(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 31 then
    raise exception 'invalid_metric_window' using errcode = '22023';
  end if;

  with eligible as (
    select user_id from public.profiles
    where onboarding_status = 'complete'
      and health_data_consent_at is not null
      and automation_block_reason is null
  ), active_plan as (
    select distinct p.user_id from public.plans p join eligible e using (user_id)
    where p.status = 'active' and p.valid_from <= p_end and p.valid_to >= p_start
  ), actions as (
    select user_id, local_date from public.daily_meal_status
    where status = 'completed' and local_date between p_start and p_end
    union all
    select user_id, local_date from public.workout_sessions
    where status = 'completed' and local_date between p_start and p_end
  ), action_counts as (
    select user_id, count(*)::integer as total from actions group by user_id
  ), checkins as (
    select user_id from public.daily_checkins where local_date between p_start and p_end
    union all
    select user_id from public.weekly_checkins where week_start between p_start and p_end
  ), checkin_users as (
    select distinct user_id from checkins
  ), event_counts as (
    select event_name, count(*)::integer as total from public.product_events
    where occurred_at >= p_start::timestamptz
      and occurred_at < (p_end + 1)::timestamptz
    group by event_name
  )
  select jsonb_build_object(
    'window_start', p_start,
    'window_end', p_end,
    'eligible_accounts', (select count(*) from eligible),
    'safely_activated_accounts', (
      select count(*) from active_plan p join action_counts a using (user_id) where a.total >= 1
    ),
    'wpm3_members', (
      select count(*) from active_plan p join action_counts a using (user_id)
      where a.total >= 3 and exists (select 1 from checkin_users c where c.user_id = p.user_id)
    ),
    'meaningful_actions', (select count(*) from actions),
    'structured_checkins', (select count(*) from checkins),
    'event_counts', coalesce((select jsonb_object_agg(event_name, total) from event_counts), '{}'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.r2_core_metrics(date, date) from public, anon, authenticated;
grant execute on function public.r2_core_metrics(date, date) to service_role;

create or replace function public.prune_product_events()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_count integer;
begin
  delete from public.product_events where occurred_at < statement_timestamp() - interval '30 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.prune_product_events() from public, anon, authenticated;
grant execute on function public.prune_product_events() to service_role;

do $cron$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cron' and p.proname = 'schedule'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text, text, text'
  ) then
    begin
      perform cron.unschedule('prune-product-events');
    exception when others then null;
    end;
    perform cron.schedule(
      'prune-product-events',
      '17 3 * * *',
      $job$select public.prune_product_events()$job$
    );
  end if;
exception
  when undefined_function then null;
  when undefined_table then null;
end;
$cron$;
