-- Stage 8: AI spend in Toman, a spend lookup for the daily budget cap, and a daily report.
-- cost_toman is the provider cost of one call as priced by LLM_PRICE_TOMAN_PER_1M_* (null when no
-- Toman price list is configured). The full ledger stays in ledger_payload.

alter table public.ai_usage_attempts
  add column if not exists cost_toman bigint
    check (cost_toman is null or cost_toman >= 0);

create index if not exists ai_usage_attempts_created_idx
  on public.ai_usage_attempts(created_at desc);

-- Total Toman spent on provider calls since a moment. Service role only.
create or replace function public.ai_spend_toman_since(p_since timestamptz)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(cost_toman), 0)::bigint
  from public.ai_usage_attempts
  where created_at >= p_since;
$$;

revoke all on function public.ai_spend_toman_since(timestamptz) from public, anon, authenticated;
grant execute on function public.ai_spend_toman_since(timestamptz) to service_role;

-- One row per Tehran calendar day: calls, outcomes, fallbacks, tokens, cost and latency.
-- Codes and numbers only; no user identifiers leave this function.
create or replace function public.ai_plan_generation_report(p_days integer default 7)
returns table (
  day date,
  provider_calls bigint,
  repair_calls bigint,
  provider_failures bigint,
  validation_failures bigint,
  plans_delivered bigint,
  delivered_llm bigint,
  delivered_llm_repaired bigint,
  delivered_fallback bigint,
  input_tokens bigint,
  cached_input_tokens bigint,
  output_tokens bigint,
  cost_toman bigint,
  calls_without_cost bigint,
  p95_latency_ms integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with rows as (
    select
      (timezone('Asia/Tehran', a.created_at))::date as day,
      a.ledger_payload -> 'pipeline' as pipeline,
      a.outcome,
      a.delivery_succeeded,
      a.input_tokens,
      a.cached_input_tokens,
      a.output_tokens,
      a.cost_toman,
      a.latency_ms,
      a.model
    from public.ai_usage_attempts a
    -- From Tehran midnight p_days - 1 days ago (today only when p_days = 1).
    where a.created_at >= timezone('Asia/Tehran', (
      (timezone('Asia/Tehran', statement_timestamp()))::date
        - (greatest(1, least(coalesce(p_days, 7), 366)) - 1)
    )::timestamp)
  ),
  calls as (
    select * from rows where pipeline ? 'call' and model not like 'deterministic:%'
  )
  select
    d.day,
    (select count(*) from calls c where c.day = d.day),
    (select count(*) from calls c where c.day = d.day and c.pipeline ->> 'call' = 'repair'),
    (select count(*) from calls c where c.day = d.day and c.outcome = 'provider_failed'),
    (select count(*) from calls c where c.day = d.day and c.outcome = 'validation_failed'),
    (select count(*) from rows r where r.day = d.day and r.delivery_succeeded),
    (select count(*) from rows r where r.day = d.day and r.delivery_succeeded
      and r.pipeline ->> 'source' = 'llm'),
    (select count(*) from rows r where r.day = d.day and r.delivery_succeeded
      and r.pipeline ->> 'source' = 'llm_repaired'),
    (select count(*) from rows r where r.day = d.day and r.delivery_succeeded
      and r.pipeline ->> 'source' like 'deterministic%'),
    (select coalesce(sum(c.input_tokens), 0)::bigint from calls c where c.day = d.day),
    (select coalesce(sum(c.cached_input_tokens), 0)::bigint from calls c where c.day = d.day),
    (select coalesce(sum(c.output_tokens), 0)::bigint from calls c where c.day = d.day),
    (select coalesce(sum(c.cost_toman), 0)::bigint from calls c where c.day = d.day),
    (select count(*) from calls c where c.day = d.day and c.cost_toman is null
      and c.outcome <> 'started'),
    (select (percentile_cont(0.95) within group (order by c.latency_ms))::integer
      from calls c where c.day = d.day and c.latency_ms is not null)
  from (select distinct day from rows) d
  order by d.day desc;
$$;

revoke all on function public.ai_plan_generation_report(integer) from public, anon, authenticated;
grant execute on function public.ai_plan_generation_report(integer) to service_role;
