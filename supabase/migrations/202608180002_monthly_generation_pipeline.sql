begin;

-- Phase 4: monthly generation jobs, gift reservation, and import with ready_at.
-- Stub provider lives in Edge Functions. This migration does not call OpenAI or Stripe.

alter table public.ai_generation_jobs
  add column if not exists product_region text,
  add column if not exists period_id uuid,
  add column if not exists attempt_count integer not null default 0
    check (attempt_count >= 0 and attempt_count <= 8);

update public.ai_generation_jobs j
set product_region = coalesce(p.product_region, 'intl')
from public.profiles p
where p.user_id = j.user_id
  and j.product_region is null;

alter table public.ai_generation_jobs
  alter column product_region set default 'intl';

update public.ai_generation_jobs
set product_region = 'intl'
where product_region is null;

alter table public.ai_generation_jobs
  alter column product_region set not null;

alter table public.ai_generation_jobs
  drop constraint if exists ai_generation_jobs_product_region_check;
alter table public.ai_generation_jobs
  add constraint ai_generation_jobs_product_region_check
  check (product_region in ('ir', 'intl'));

alter table public.ai_generation_jobs
  drop constraint if exists ai_generation_jobs_status_check;
alter table public.ai_generation_jobs
  add constraint ai_generation_jobs_status_check
  check (status in (
    'queued',
    'validating',
    'importing',
    'ready',
    'failed',
    'in_progress',
    'completed',
    'canceled'
  ));

alter table public.ai_generation_jobs
  drop constraint if exists ai_generation_jobs_period_fk;
alter table public.ai_generation_jobs
  add constraint ai_generation_jobs_period_fk
  foreign key (period_id, user_id)
  references public.monthly_plan_periods(id, user_id)
  on delete set null;

create unique index if not exists ai_generation_jobs_one_inflight
on public.ai_generation_jobs(user_id)
where status in ('queued', 'validating', 'importing', 'in_progress');

create or replace function public.release_stale_ai_reservations(
  p_user_id uuid,
  p_max_age_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  v_count integer;
begin
  if p_user_id is null or p_max_age_seconds not between 480 and 86400 then
    raise exception 'invalid_reconciliation_arguments' using errcode = '22023';
  end if;
  with stale as (
    update public.usage_ledger
    set status = 'released', finalized_at = statement_timestamp()
    where user_id = p_user_id
      and status = 'reserved'
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
    and v_profile.product_region = any (allowed_markets)
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
    user_id,
    source,
    status,
    period_start,
    period_end,
    plan_generation_limit
  ) values (
    p_user_id,
    'gift',
    'active',
    statement_timestamp(),
    v_period_end,
    1
  )
  returning * into v_entitlement;

  insert into public.gift_reservations(
    campaign_id,
    user_id,
    entitlement_id,
    status,
    reserved_cost_usd
  ) values (
    v_campaign.id,
    p_user_id,
    v_entitlement.id,
    'reserved',
    v_campaign.reservation_cost_usd
  )
  returning * into v_existing;

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

create or replace function public.claim_generation_job(
  p_user_id uuid,
  p_job_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.ai_generation_jobs%rowtype;
begin
  if p_user_id is null or p_job_id is null then
    raise exception 'invalid_job_claim' using errcode = '22023';
  end if;

  select * into v_job
  from public.ai_generation_jobs
  where id = p_job_id and user_id = p_user_id
  for update;
  if v_job.id is null then
    raise exception 'generation_job_not_found' using errcode = 'P0002';
  end if;

  if v_job.status in ('ready', 'completed') then
    return jsonb_build_object('claimed', false, 'job', to_jsonb(v_job));
  end if;
  if v_job.status in ('validating', 'importing', 'in_progress') then
    return jsonb_build_object('claimed', false, 'job', to_jsonb(v_job));
  end if;
  if v_job.attempt_count >= 3 then
    return jsonb_build_object('claimed', false, 'job', to_jsonb(v_job));
  end if;
  if v_job.status not in ('queued', 'failed') then
    return jsonb_build_object('claimed', false, 'job', to_jsonb(v_job));
  end if;

  update public.ai_generation_jobs
  set
    status = 'validating',
    attempt_count = attempt_count + 1,
    started_at = coalesce(started_at, statement_timestamp()),
    error_code = null,
    error_detail = null,
    finished_at = null
  where id = p_job_id
  returning * into v_job;

  return jsonb_build_object('claimed', true, 'job', to_jsonb(v_job));
end;
$$;

revoke all on function public.claim_generation_job(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_generation_job(uuid, uuid) to service_role;

create or replace function public.persist_generated_plan(
  p_user_id uuid,
  p_job_id uuid,
  p_goal_id uuid,
  p_plan_name text,
  p_valid_from date,
  p_valid_to date,
  p_locale text,
  p_schema_version text,
  p_prompt_version text,
  p_model text,
  p_openai_response_id text,
  p_content jsonb,
  p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.ai_generation_jobs%rowtype;
  v_plan_id uuid;
  v_version_id uuid;
  v_ready timestamptz := statement_timestamp();
  v_timezone text;
  v_ends timestamptz;
  v_valid_from date;
  v_valid_to date;
begin
  if p_user_id is null
    or p_valid_to < p_valid_from
    or p_locale not in ('fa-IR', 'en-US')
    or jsonb_typeof(p_content) <> 'object'
    or p_content_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_generated_plan' using errcode = '22023';
  end if;

  select * into v_job
  from public.ai_generation_jobs
  where id = p_job_id and user_id = p_user_id
  for update;

  if v_job.id is null or v_job.status not in ('in_progress', 'validating', 'importing', 'queued') then
    raise exception 'generation_job_not_in_progress' using errcode = 'P0001';
  end if;

  select timezone into v_timezone
  from public.profiles
  where user_id = p_user_id;
  v_timezone := coalesce(nullif(v_timezone, ''), 'UTC');
  v_valid_from := coalesce(p_valid_from, (timezone(v_timezone, v_ready))::date);
  v_ends := timezone(v_timezone, timezone(v_timezone, v_ready) + interval '1 month');
  v_valid_to := coalesce(
    p_valid_to,
    (timezone(v_timezone, v_ends) - interval '1 second')::date
  );

  update public.ai_generation_jobs
  set status = 'importing'
  where id = p_job_id
    and status <> 'importing';

  insert into public.plans(
    user_id,
    goal_id,
    name,
    status,
    valid_from,
    valid_to,
    locale
  ) values (
    p_user_id,
    p_goal_id,
    p_plan_name,
    'draft',
    v_valid_from,
    v_valid_to,
    p_locale
  ) returning id into v_plan_id;

  insert into public.plan_versions(
    plan_id,
    user_id,
    generation_job_id,
    version,
    schema_version,
    source,
    prompt_version,
    model,
    content,
    content_sha256
  ) values (
    v_plan_id,
    p_user_id,
    p_job_id,
    1,
    p_schema_version,
    'openai',
    p_prompt_version,
    p_model,
    p_content,
    p_content_sha256
  ) returning id into v_version_id;

  update public.plans
  set status = 'archived'
  where user_id = p_user_id
    and id <> v_plan_id
    and status = 'active'
    and daterange(valid_from, valid_to, '[]') && daterange(v_valid_from, v_valid_to, '[]');

  update public.plans
  set active_version_id = v_version_id, status = 'active'
  where id = v_plan_id;

  update public.ai_generation_jobs
  set
    status = 'ready',
    openai_response_id = p_openai_response_id,
    model = coalesce(p_model, model),
    prompt_version = coalesce(p_prompt_version, prompt_version),
    finished_at = v_ready,
    error_code = null,
    error_detail = null
  where id = p_job_id;

  update public.monthly_plan_periods
  set
    generation_job_id = p_job_id,
    imported_plan_version_id = v_version_id,
    status = 'ready',
    ready_at = v_ready,
    starts_at = v_ready,
    ends_at = v_ends
  where id = v_job.period_id
    and user_id = p_user_id;

  update public.gift_reservations
  set status = 'consumed', actual_cost_usd = reserved_cost_usd
  where user_id = p_user_id
    and status = 'reserved';

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'plan.generated',
    'service',
    jsonb_build_object('plan_id', v_plan_id, 'plan_version_id', v_version_id, 'job_id', p_job_id)
  );

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'plan_version_id', v_version_id,
    'imported_at', v_ready
  );
end;
$$;

revoke all on function public.persist_generated_plan(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_generated_plan(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text
) to service_role;

create or replace function public.persist_generated_plan_and_finalize(
  p_user_id uuid,
  p_job_id uuid,
  p_goal_id uuid,
  p_plan_name text,
  p_valid_from date,
  p_valid_to date,
  p_locale text,
  p_schema_version text,
  p_prompt_version text,
  p_model text,
  p_openai_response_id text,
  p_content jsonb,
  p_content_sha256 text,
  p_reservation_id uuid,
  p_attempt_token uuid,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_cached_input_tokens integer default null,
  p_reasoning_tokens integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_plan jsonb;
begin
  v_plan := public.persist_generated_plan(
    p_user_id,
    p_job_id,
    p_goal_id,
    p_plan_name,
    p_valid_from,
    p_valid_to,
    p_locale,
    p_schema_version,
    p_prompt_version,
    p_model,
    p_openai_response_id,
    p_content,
    p_content_sha256
  );
  perform public.finalize_ai_request(
    p_reservation_id,
    p_attempt_token,
    'completed',
    p_input_tokens,
    p_output_tokens,
    p_cached_input_tokens,
    p_reasoning_tokens,
    null
  );
  return v_plan;
end;
$$;

revoke all on function public.persist_generated_plan_and_finalize(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text,
  uuid, uuid, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.persist_generated_plan_and_finalize(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text,
  uuid, uuid, integer, integer, integer, integer
) to service_role;

commit;
