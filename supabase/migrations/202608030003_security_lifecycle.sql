-- Safety decisions and trial eligibility must not be reversible by resubmitting
-- self-service onboarding answers.
create or replace function private.prevent_automation_unblock()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if old.onboarding_status = 'automation_blocked'
    and new.onboarding_status <> 'automation_blocked'
    and coalesce(current_setting('momentum.allow_automation_unblock', true), '') <> 'on'
  then
    raise exception 'automation_review_required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_automation_unblock() from public, anon, authenticated;

drop trigger if exists profiles_prevent_automation_unblock on public.profiles;
create trigger profiles_prevent_automation_unblock
before update of onboarding_status on public.profiles
for each row execute function private.prevent_automation_unblock();

create or replace function public.admin_resolve_automation_block(
  p_user_id uuid,
  p_clear boolean,
  p_review_reference text
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_catalog, pg_temp
as $$
begin
  if p_user_id is null or char_length(trim(coalesce(p_review_reference, ''))) not between 8 and 240 then
    raise exception 'invalid_review_resolution' using errcode = '22023';
  end if;
  perform set_config('momentum.allow_automation_unblock', 'on', true);
  update public.profiles
  set
    onboarding_status = case when p_clear then 'complete' else 'automation_blocked' end,
    automation_block_reason = case when p_clear then null else 'manual_review_required' end
  where user_id = p_user_id;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'automation.review_resolved',
    'admin',
    jsonb_build_object('cleared', p_clear, 'review_reference', left(trim(p_review_reference), 240))
  );
end;
$$;

revoke all on function public.admin_resolve_automation_block(uuid, boolean, text)
from public, anon, authenticated;
grant execute on function public.admin_resolve_automation_block(uuid, boolean, text)
to service_role;

-- One account can receive at most one trial, including after expiry/revocation.
-- If pre-existing data violates this invariant, the migration fails for manual
-- review instead of silently rewriting billing history.
create unique index if not exists entitlements_one_trial_per_user
on public.entitlements(user_id)
where source = 'trial';

-- Service-only, audited bridge for the manual alpha workflow. Payment webhooks
-- must call an equivalent reviewed path once checkout is implemented.
create or replace function public.admin_verify_ai_country(
  p_user_id uuid,
  p_country_code text,
  p_review_reference text
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_catalog, pg_temp
as $$
declare
  v_country text := upper(trim(coalesce(p_country_code, '')));
begin
  if p_user_id is null
    or v_country !~ '^[A-Z]{2}$'
    or v_country = 'IR'
    or char_length(trim(coalesce(p_review_reference, ''))) not between 8 and 240
  then
    raise exception 'invalid_country_verification' using errcode = '22023';
  end if;
  update public.profiles
  set
    ai_billing_country_code = v_country,
    ai_country_verified_at = statement_timestamp(),
    ai_country_verification_method = 'admin_review'
  where user_id = p_user_id;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'ai.country_verified',
    'admin',
    jsonb_build_object('country_code', v_country, 'review_reference', left(trim(p_review_reference), 240))
  );
end;
$$;

revoke all on function public.admin_verify_ai_country(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.admin_verify_ai_country(uuid, text, text)
to service_role;

-- Release reservations that outlive the maximum hosted Edge Function runtime.
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
      and status in ('queued', 'in_progress')
    returning id
  )
  select count(*)::integer into v_count from stale;
  return v_count;
end;
$$;

revoke all on function public.release_stale_ai_reservations(uuid, integer)
from public, anon, authenticated;
grant execute on function public.release_stale_ai_reservations(uuid, integer)
to service_role;

-- Raw report objects may be removed immediately after successful extraction.
alter table public.body_composition_measurements
  drop constraint if exists body_composition_extraction_has_report;
alter table public.body_composition_measurements
  add constraint body_composition_extraction_has_report check (
    extraction_status in ('not_requested', 'needs_confirmation', 'confirmed')
    or report_object_path is not null
  );

-- Persist generated output and consume quota in one database transaction.
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
set search_path = public, pg_catalog, pg_temp
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

create or replace function public.persist_coach_reply_and_finalize(
  p_user_id uuid,
  p_thread_id uuid,
  p_reservation_id uuid,
  p_attempt_token uuid,
  p_content text,
  p_safety_level text,
  p_safety_reason text,
  p_suggested_actions text[],
  p_openai_response_id text,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_cached_input_tokens integer default null,
  p_reasoning_tokens integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  v_message public.coach_messages%rowtype;
begin
  insert into public.coach_messages(
    thread_id,
    user_id,
    usage_ledger_id,
    role,
    content,
    safety_level,
    safety_reason,
    suggested_actions,
    openai_response_id
  ) values (
    p_thread_id,
    p_user_id,
    p_reservation_id,
    'assistant',
    p_content,
    p_safety_level,
    p_safety_reason,
    coalesce(p_suggested_actions, '{}'),
    p_openai_response_id
  ) returning * into v_message;

  update public.coach_threads
  set updated_at = statement_timestamp()
  where id = p_thread_id and user_id = p_user_id;
  if not found then raise exception 'coach_thread_not_found' using errcode = 'P0002'; end if;

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

  return jsonb_build_object(
    'id', v_message.id,
    'thread_id', v_message.thread_id,
    'content', v_message.content,
    'safety_level', v_message.safety_level,
    'safety_reason', v_message.safety_reason,
    'suggested_actions', v_message.suggested_actions,
    'created_at', v_message.created_at
  );
end;
$$;

revoke all on function public.persist_coach_reply_and_finalize(
  uuid, uuid, uuid, uuid, text, text, text, text[], text,
  integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.persist_coach_reply_and_finalize(
  uuid, uuid, uuid, uuid, text, text, text, text[], text,
  integer, integer, integer, integer
) to service_role;

create or replace function public.persist_body_extraction_and_finalize(
  p_user_id uuid,
  p_measurement_id uuid,
  p_reservation_id uuid,
  p_attempt_token uuid,
  p_metrics jsonb,
  p_extraction_result jsonb,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_cached_input_tokens integer default null,
  p_reasoning_tokens integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  v_measurement public.body_composition_measurements%rowtype;
begin
  if jsonb_typeof(p_metrics) <> 'object' or jsonb_typeof(p_extraction_result) <> 'object' then
    raise exception 'invalid_body_extraction' using errcode = '22023';
  end if;
  update public.body_composition_measurements
  set
    weight_kg = nullif(p_metrics ->> 'weight_kg', '')::numeric,
    body_fat_percent = nullif(p_metrics ->> 'body_fat_percent', '')::numeric,
    fat_mass_kg = nullif(p_metrics ->> 'fat_mass_kg', '')::numeric,
    lean_mass_kg = nullif(p_metrics ->> 'lean_mass_kg', '')::numeric,
    skeletal_muscle_mass_kg = nullif(p_metrics ->> 'skeletal_muscle_mass_kg', '')::numeric,
    visceral_fat_rating = nullif(p_metrics ->> 'visceral_fat_rating', '')::numeric,
    waist_cm = nullif(p_metrics ->> 'waist_cm', '')::numeric,
    basal_metabolic_rate_kcal = nullif(p_metrics ->> 'basal_metabolic_rate_kcal', '')::numeric,
    extraction_status = 'needs_confirmation',
    extraction_result = p_extraction_result,
    extraction_error_code = null
  where id = p_measurement_id
    and user_id = p_user_id
    and extraction_status = 'processing'
  returning * into v_measurement;
  if v_measurement.id is null then
    raise exception 'body_extraction_not_in_progress' using errcode = 'P0001';
  end if;

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

  return jsonb_build_object(
    'id', v_measurement.id,
    'extraction_status', v_measurement.extraction_status,
    'extraction_result', v_measurement.extraction_result
  );
end;
$$;

revoke all on function public.persist_body_extraction_and_finalize(
  uuid, uuid, uuid, uuid, jsonb, jsonb, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.persist_body_extraction_and_finalize(
  uuid, uuid, uuid, uuid, jsonb, jsonb, integer, integer, integer, integer
) to service_role;
