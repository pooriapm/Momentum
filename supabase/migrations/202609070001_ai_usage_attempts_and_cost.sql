-- Versioned per-attempt usage ledger + pass provider cost through plan finalize.
-- Keeps budget reservation (usage_ledger) separate from detailed attempt spend.

create table if not exists public.ai_usage_attempts (
  id uuid primary key,
  generation_job_id uuid not null references public.ai_generation_jobs(id) on delete cascade,
  cycle_index integer not null check (cycle_index >= 1),
  attempt_number integer not null check (attempt_number >= 1),
  model text not null check (char_length(model) between 1 and 120),
  service_tier text not null default 'standard'
    check (service_tier in ('standard', 'batch', 'flex')),
  prompt_version text not null,
  schema_version text not null,
  catalog_release_id text not null,
  pricing_table_version text not null,
  profile_snapshot_version text not null,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  cached_input_tokens integer check (cached_input_tokens is null or cached_input_tokens >= 0),
  cache_write_tokens integer check (cache_write_tokens is null or cache_write_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  reasoning_tokens integer check (reasoning_tokens is null or reasoning_tokens >= 0),
  provider_response_id text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  outcome text not null check (outcome in (
    'accepted',
    'validation_failed',
    'persistence_failed',
    'provider_failed',
    'repair_applied',
    'canceled'
  )),
  validation_failure_category text
    check (
      validation_failure_category is null or
      validation_failure_category in (
        'schema',
        'catalog_reference',
        'allergen',
        'equipment',
        'nutrition_arithmetic',
        'day_coverage',
        'safety',
        'other'
      )
    ),
  cost_microusd bigint check (cost_microusd is null or cost_microusd >= 0),
  cost_certainty text not null default 'unknown'
    check (cost_certainty in ('measured', 'estimated', 'unknown')),
  cost_notes text[] not null default '{}',
  reservation_consumed boolean not null default true,
  delivery_succeeded boolean not null default false,
  ledger_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp()
);

create index if not exists ai_usage_attempts_job_idx
  on public.ai_usage_attempts(generation_job_id, attempt_number);
create index if not exists ai_usage_attempts_outcome_idx
  on public.ai_usage_attempts(outcome, created_at desc);

alter table public.ai_usage_attempts enable row level security;

revoke all on public.ai_usage_attempts from public, anon, authenticated;
grant select, insert, update on public.ai_usage_attempts to service_role;

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
  p_reasoning_tokens integer default null,
  p_provider_cost_microusd bigint default null
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
    p_provider_cost_microusd
  );
  return v_plan;
end;
$$;

revoke all on function public.persist_generated_plan_and_finalize(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text,
  uuid, uuid, integer, integer, integer, integer, bigint
) from public, anon, authenticated;
grant execute on function public.persist_generated_plan_and_finalize(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text,
  uuid, uuid, integer, integer, integer, integer, bigint
) to service_role;
