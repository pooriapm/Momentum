begin;

-- Same-day meal undo, global stale-job reconciliation, and an ops-only
-- first-plan campaign toggle. This migration does not call OpenAI or Stripe
-- and does not enable the gift campaign.

-- ---------------------------------------------------------------------------
-- 1. Same-day meal undo (owner + current local_date + completed slot only)
-- ---------------------------------------------------------------------------
create or replace function public.undo_meal_option(
  p_user_id uuid,
  p_local_date date,
  p_slot_key text,
  p_option_key text,
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
  v_status public.daily_meal_status%rowtype;
  v_response jsonb;
begin
  if p_user_id is null
    or p_local_date is null
    or p_slot_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or p_option_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_undo_meal_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'undo-meal'
    and idempotency_key = p_idempotency_key;

  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  -- Lock window: current profile-local day only. Yesterday stays completed.
  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'meal_date_not_current' using errcode = 'P0001';
  end if;

  select * into v_status
  from public.daily_meal_status
  where user_id = p_user_id
    and local_date = p_local_date
    and slot_key = p_slot_key
  for update;

  if v_status.id is null then
    raise exception 'meal_not_completed' using errcode = 'P0002';
  end if;

  if v_status.option_key is distinct from p_option_key then
    raise exception 'completed_meal_locked' using errcode = 'P0001';
  end if;

  if v_status.status = 'completed' then
    update public.daily_meal_status
    set
      status = 'planned',
      completed_at = null,
      updated_at = statement_timestamp()
    where id = v_status.id
      and user_id = p_user_id
    returning * into v_status;
  elsif v_status.status <> 'planned' then
    raise exception 'completed_meal_locked' using errcode = 'P0001';
  end if;

  v_response := jsonb_build_object(
    'id', v_status.id,
    'local_date', v_status.local_date,
    'plan_version_id', v_status.plan_version_id,
    'slot_key', v_status.slot_key,
    'option_key', v_status.option_key,
    'status', v_status.status,
    'completed_at', v_status.completed_at,
    'option_title', v_status.option_title_snapshot,
    'nutrition', v_status.nutrition_snapshot,
    'updated_at', v_status.updated_at
  );

  insert into private.account_mutation_keys(
    user_id,
    action,
    idempotency_key,
    request_sha256,
    response_payload
  ) values (
    p_user_id,
    'undo-meal',
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
      and action = 'undo-meal'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.undo_meal_option(uuid, date, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.undo_meal_option(uuid, date, text, text, text, text)
to service_role;

-- ---------------------------------------------------------------------------
-- 2. Stale AI reservation / in-flight job reconciliation (no provider call)
--
-- Hosted Supabase with pg_cron:
--   select cron.schedule(
--     'reconcile-stale-generation-jobs',
--     '*/10 * * * *',
--     $$select public.reconcile_stale_generation_jobs()$$
--   );
-- Ops (service_role) if cron is not installed:
--   select public.reconcile_stale_generation_jobs();
-- Optional pg_net (commented; not enabled):
--   select net.http_post(
--     url := '<project-url>/rest/v1/rpc/reconcile_stale_generation_jobs',
--     body := '{}'::jsonb,
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <service-role-key>'
--     )
--   );
-- ---------------------------------------------------------------------------
create or replace function public.reconcile_stale_generation_jobs(
  p_max_age_seconds integer default 600
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  v_count integer;
begin
  if p_max_age_seconds not between 480 and 86400 then
    raise exception 'invalid_reconciliation_arguments' using errcode = '22023';
  end if;
  with stale as (
    update public.usage_ledger
    set status = 'released', finalized_at = statement_timestamp()
    where status = 'reserved'
      and created_at < statement_timestamp() - make_interval(secs => p_max_age_seconds)
    returning id
  ), failed_jobs as (
    update public.ai_generation_jobs
    set status = 'failed', error_code = 'reservation_expired', finished_at = statement_timestamp()
    where usage_ledger_id in (select id from stale)
      and status in ('queued', 'validating', 'importing', 'in_progress')
    returning id
  )
  select count(*)::integer into v_count from stale;
  return v_count;
end;
$$;

revoke all on function public.reconcile_stale_generation_jobs(integer)
from public, anon, authenticated;
grant execute on function public.reconcile_stale_generation_jobs(integer)
to service_role;

do $cron$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cron'
      and p.proname = 'schedule'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text, text, text'
  ) then
    begin
      perform cron.unschedule('reconcile-stale-generation-jobs');
    exception
      when others then
        null;
    end;
    perform cron.schedule(
      'reconcile-stale-generation-jobs',
      '*/10 * * * *',
      $job$select public.reconcile_stale_generation_jobs()$job$
    );
  end if;
exception
  when undefined_function then
    null;
  when undefined_table then
    null;
  when invalid_schema_name then
    null;
end;
$cron$;

-- ---------------------------------------------------------------------------
-- 3. Ops helper for the first-plan gift campaign.
-- Default row stays enabled = false. Do not call this from user Edge paths.
-- Example (service_role only, after Legal/ops approval):
--   select public.enable_first_plan_campaign(
--     '20000000-0000-4000-8000-000000000001',
--     true,
--     250.00,
--     2.50
--   );
-- ---------------------------------------------------------------------------
create or replace function public.enable_first_plan_campaign(
  p_campaign_id uuid,
  p_enabled boolean,
  p_total_budget_usd numeric default null,
  p_reservation_cost_usd numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.first_plan_campaigns%rowtype;
begin
  if p_campaign_id is null or p_enabled is null then
    raise exception 'invalid_campaign_arguments' using errcode = '22023';
  end if;
  if p_total_budget_usd is not null and p_total_budget_usd < 0 then
    raise exception 'invalid_campaign_arguments' using errcode = '22023';
  end if;
  if p_reservation_cost_usd is not null and p_reservation_cost_usd <= 0 then
    raise exception 'invalid_campaign_arguments' using errcode = '22023';
  end if;

  select * into v_campaign
  from public.first_plan_campaigns
  where id = p_campaign_id
  for update;
  if v_campaign.id is null then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  update public.first_plan_campaigns
  set
    enabled = p_enabled,
    total_budget_usd = coalesce(p_total_budget_usd, v_campaign.total_budget_usd),
    reservation_cost_usd = coalesce(p_reservation_cost_usd, v_campaign.reservation_cost_usd),
    remaining_budget_usd = case
      when p_total_budget_usd is null then v_campaign.remaining_budget_usd
      else least(
        p_total_budget_usd,
        greatest(
          0,
          v_campaign.remaining_budget_usd + (p_total_budget_usd - v_campaign.total_budget_usd)
        )
      )
    end
  where id = p_campaign_id
  returning * into v_campaign;

  return jsonb_build_object(
    'id', v_campaign.id,
    'enabled', v_campaign.enabled,
    'total_budget_usd', v_campaign.total_budget_usd,
    'reservation_cost_usd', v_campaign.reservation_cost_usd,
    'remaining_budget_usd', v_campaign.remaining_budget_usd
  );
end;
$$;

revoke all on function public.enable_first_plan_campaign(uuid, boolean, numeric, numeric)
from public, anon, authenticated;
grant execute on function public.enable_first_plan_campaign(uuid, boolean, numeric, numeric)
to service_role;

commit;
