begin;

-- The product sells one complete 30-day monthly plan. Short-plan generation
-- must not be accepted for any new provider job.
update public.ai_generation_jobs
set requested_days = 30
where requested_days <> 30
  and status in ('queued', 'failed');

alter table public.ai_generation_jobs
  drop constraint if exists ai_generation_jobs_requested_days_check;

-- Preserve completed historical audit rows while enforcing 30 days for every
-- new or retried job. A later archival migration can validate the constraint
-- after legacy rows have aged out.
alter table public.ai_generation_jobs
  add constraint ai_generation_jobs_requested_days_check
  check (requested_days = 30) not valid;

-- The stored plan dates are inclusive, so a 30-day plan has a difference of
-- 29 between valid_from and valid_to. Existing archived plans remain readable.
alter table public.plans
  drop constraint if exists plans_thirty_day_range;

alter table public.plans
  add constraint plans_thirty_day_range
  check (valid_to - valid_from = 29) not valid;

-- The date range and the stored document must agree. NOT VALID preserves
-- historical audit rows, while PostgreSQL still enforces this for every new
-- plan version.
alter table public.plan_versions
  drop constraint if exists plan_versions_thirty_day_content;

alter table public.plan_versions
  add constraint plan_versions_thirty_day_content
  check (
    jsonb_array_length(content -> 'days') = 30
    and (content -> 'days') @> '[
      {"day_index":0},{"day_index":1},{"day_index":2},{"day_index":3},{"day_index":4},
      {"day_index":5},{"day_index":6},{"day_index":7},{"day_index":8},{"day_index":9},
      {"day_index":10},{"day_index":11},{"day_index":12},{"day_index":13},{"day_index":14},
      {"day_index":15},{"day_index":16},{"day_index":17},{"day_index":18},{"day_index":19},
      {"day_index":20},{"day_index":21},{"day_index":22},{"day_index":23},{"day_index":24},
      {"day_index":25},{"day_index":26},{"day_index":27},{"day_index":28},{"day_index":29}
    ]'::jsonb
  ) not valid;

commit;
