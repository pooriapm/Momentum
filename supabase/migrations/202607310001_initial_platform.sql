begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  date_of_birth date check (date_of_birth is null or date_of_birth >= date '1900-01-01'),
  sex text check (sex is null or sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  height_cm numeric(5,2) check (height_cm is null or height_cm between 100 and 250),
  locale text not null default 'fa-IR' check (locale in ('fa-IR', 'en-US')),
  timezone text not null default 'Asia/Tehran' check (char_length(timezone) between 1 and 80),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  pricing_market text not null default 'global' check (pricing_market in ('ir', 'global')),
  ai_billing_country_code text
    check (ai_billing_country_code is null or ai_billing_country_code ~ '^[A-Z]{2}$'),
  ai_country_verified_at timestamptz,
  ai_country_verification_method text
    check (
      ai_country_verification_method is null
      or ai_country_verification_method in ('payment_provider', 'admin_review')
    ),
  unit_system text not null default 'metric' check (unit_system = 'metric'),
  onboarding_status text not null default 'started'
    check (onboarding_status in ('started', 'profile_complete', 'complete', 'automation_blocked')),
  automation_block_reason text
    check (automation_block_reason is null or char_length(automation_block_reason) <= 120),
  terms_accepted_at timestamptz,
  terms_version text check (terms_version is null or char_length(terms_version) between 1 and 80),
  privacy_accepted_at timestamptz,
  privacy_version text check (privacy_version is null or char_length(privacy_version) between 1 and 80),
  health_data_consent_at timestamptz,
  health_consent_version text
    check (health_consent_version is null or char_length(health_consent_version) between 1 and 80),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint profiles_ai_country_verification_complete check (
    num_nonnulls(
      ai_billing_country_code,
      ai_country_verified_at,
      ai_country_verification_method
    ) in (0, 3)
  ),
  constraint profiles_consent_versions_complete check (
    (terms_accepted_at is null) = (terms_version is null)
    and (privacy_accepted_at is null) = (privacy_version is null)
    and (health_data_consent_at is null) = (health_consent_version is null)
  )
);

create or replace function private.validate_profile_timezone()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = new.timezone
  ) then
    raise exception 'invalid_profile_timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_profile_timezone()
from public, anon, authenticated;

create trigger profiles_validate_timezone
before insert or update of timezone on public.profiles
for each row execute function private.validate_profile_timezone();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.onboarding_drafts (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  current_step text not null default 'profile'
    check (char_length(current_step) between 1 and 80 and current_step ~ '^[a-z0-9][a-z0-9_-]*$'),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 32768),
  updated_at timestamptz not null default statement_timestamp()
);

create trigger onboarding_drafts_set_updated_at
before update on public.onboarding_drafts
for each row execute function public.set_updated_at();

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  goal_type text not null
    check (goal_type in ('fat_loss', 'muscle_gain', 'maintenance', 'performance', 'custom')),
  custom_goal text check (custom_goal is null or char_length(custom_goal) <= 1000),
  start_weight_kg numeric(6,2) not null check (start_weight_kg between 35 and 350),
  target_weight_kg numeric(6,2) not null check (target_weight_kg between 35 and 350),
  journey_start_date date not null,
  target_date date not null,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint goals_target_after_start check (target_date >= journey_start_date),
  constraint goals_id_user_unique unique (id, user_id)
);

create unique index goals_one_active_per_user_idx
on public.goals(user_id)
where status = 'active';

create index goals_user_status_idx on public.goals(user_id, status);

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create table public.dietary_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  dietary_pattern text check (dietary_pattern is null or char_length(dietary_pattern) <= 200),
  requested_meal_pattern text check (requested_meal_pattern is null or char_length(requested_meal_pattern) <= 500),
  preferred_option_count smallint not null default 2 check (preferred_option_count between 1 and 6),
  favorite_foods text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  allergies text[] not null default '{}',
  cooking_constraints text[] not null default '{}',
  available_equipment text[] not null default '{}',
  work_schedule text check (work_schedule is null or char_length(work_schedule) <= 1000),
  budget_tier text not null default 'medium' check (budget_tier in ('low', 'medium', 'high', 'custom')),
  budget_note text check (budget_note is null or char_length(budget_note) <= 500),
  restaurant_meals_per_week smallint not null default 0 check (restaurant_meals_per_week between 0 and 21),
  restaurant_preferences text[] not null default '{}',
  grocery_preferences text[] not null default '{}',
  cuisine_region text not null default 'international'
    check (cuisine_region in ('iran', 'middle_east', 'international')),
  updated_at timestamptz not null default statement_timestamp(),
  constraint dietary_preferences_array_limits check (
    cardinality(favorite_foods) <= 50
    and cardinality(disliked_foods) <= 50
    and cardinality(allergies) <= 50
    and cardinality(cooking_constraints) <= 50
    and cardinality(available_equipment) <= 50
    and cardinality(restaurant_preferences) <= 50
    and cardinality(grocery_preferences) <= 50
  )
);

create trigger dietary_preferences_set_updated_at
before update on public.dietary_preferences
for each row execute function public.set_updated_at();

create table public.health_context (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  medical_considerations text[] not null default '{}',
  medications text[] not null default '{}',
  supplements text[] not null default '{}',
  clinician_notes text check (clinician_notes is null or char_length(clinician_notes) <= 2000),
  updated_at timestamptz not null default statement_timestamp(),
  constraint health_context_array_limits check (
    cardinality(medical_considerations) <= 50
    and cardinality(medications) <= 50
    and cardinality(supplements) <= 50
  )
);

create trigger health_context_set_updated_at
before update on public.health_context
for each row execute function public.set_updated_at();

create table public.body_composition_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  measured_at timestamptz not null,
  source_type text not null check (source_type in ('image', 'pdf', 'scan', 'manual', 'device')),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg between 20 and 500),
  body_fat_percent numeric(5,2) check (body_fat_percent is null or body_fat_percent between 0 and 80),
  fat_mass_kg numeric(6,2) check (fat_mass_kg is null or fat_mass_kg between 0 and 350),
  lean_mass_kg numeric(6,2) check (lean_mass_kg is null or lean_mass_kg between 0 and 350),
  skeletal_muscle_mass_kg numeric(6,2)
    check (skeletal_muscle_mass_kg is null or skeletal_muscle_mass_kg between 0 and 250),
  visceral_fat_rating numeric(6,2)
    check (visceral_fat_rating is null or visceral_fat_rating between 0 and 100),
  waist_cm numeric(6,2) check (waist_cm is null or waist_cm between 20 and 300),
  basal_metabolic_rate_kcal numeric(7,2)
    check (basal_metabolic_rate_kcal is null or basal_metabolic_rate_kcal between 0 and 10000),
  notes text[] not null default '{}',
  report_object_path text,
  extraction_status text not null default 'not_requested'
    check (extraction_status in (
      'pending',
      'processing',
      'needs_confirmation',
      'confirmed',
      'failed',
      'not_requested'
    )),
  extraction_result jsonb
    check (extraction_result is null or jsonb_typeof(extraction_result) = 'object'),
  extraction_error_code text
    check (extraction_error_code is null or char_length(extraction_error_code) <= 120),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint body_composition_notes_limit check (cardinality(notes) <= 30),
  constraint body_composition_report_owned_path check (
    report_object_path is null or report_object_path like user_id::text || '/%'
  ),
  constraint body_composition_extraction_has_report check (
    extraction_status in ('not_requested', 'needs_confirmation', 'confirmed')
    or report_object_path is not null
  ),
  constraint body_composition_extraction_result_consistent check (
    (extraction_status in ('needs_confirmation', 'confirmed') and extraction_result is not null)
    or (extraction_status not in ('needs_confirmation', 'confirmed') and extraction_result is null)
  ),
  constraint body_composition_has_measurement_or_pending_report check (
    num_nonnulls(
      weight_kg,
      body_fat_percent,
      fat_mass_kg,
      lean_mass_kg,
      skeletal_muscle_mass_kg,
      visceral_fat_rating,
      waist_cm,
      basal_metabolic_rate_kcal
    ) > 0
    or (
      report_object_path is not null
      and extraction_status in ('pending', 'processing', 'needs_confirmation', 'failed')
    )
  )
);

create index body_composition_user_measured_idx
on public.body_composition_measurements(user_id, measured_at desc);

create trigger body_composition_set_updated_at
before update on public.body_composition_measurements
for each row execute function public.set_updated_at();

create table public.training_schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  activity_type text not null
    check (activity_type in ('rest', 'strength', 'crossfit', 'full_body', 'cardio', 'walk', 'mobility', 'other')),
  local_start_time time,
  duration_minutes smallint check (duration_minutes is null or duration_minutes between 0 and 1440),
  intensity text check (intensity is null or intensity in ('low', 'moderate', 'high')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create index training_schedule_user_weekday_idx
on public.training_schedule_items(user_id, weekday, local_start_time);

create trigger training_schedule_set_updated_at
before update on public.training_schedule_items
for each row execute function public.set_updated_at();

create table public.product_prices (
  id uuid primary key default gen_random_uuid(),
  product_code text not null check (product_code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  market text not null check (market in ('ir', 'global')),
  currency text not null check (currency in ('IRR', 'USD')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  amount_minor bigint not null check (amount_minor >= 0),
  included_plan_generations integer not null check (included_plan_generations >= 0),
  included_coach_messages integer not null check (included_coach_messages >= 0),
  included_body_composition_extractions integer not null
    check (included_body_composition_extractions >= 0),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint product_prices_market_currency check (
    (market = 'ir' and currency = 'IRR') or (market = 'global' and currency = 'USD')
  ),
  constraint product_prices_valid_window check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint product_prices_identity unique (product_code, market, currency, billing_interval)
);

create index product_prices_market_active_idx
on public.product_prices(market, active, billing_interval);

create trigger product_prices_set_updated_at
before update on public.product_prices
for each row execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  product_price_id uuid references public.product_prices(id) on delete restrict,
  provider text not null default 'manual' check (provider in ('manual', 'stripe', 'iran_gateway')),
  provider_customer_id text,
  provider_subscription_id text,
  status text not null check (status in ('incomplete', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint subscriptions_period_valid check (current_period_end > current_period_start)
);

create index subscriptions_user_status_idx on public.subscriptions(user_id, status);
create index subscriptions_price_idx on public.subscriptions(product_price_id);
create unique index subscriptions_provider_id_unique_idx
on public.subscriptions(provider, provider_subscription_id)
where provider_subscription_id is not null;

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  source text not null check (source in ('trial', 'subscription', 'admin', 'promotion')),
  status text not null check (status in ('trial', 'active', 'expired', 'revoked')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  plan_generation_limit integer not null check (plan_generation_limit >= 0),
  coach_message_limit integer not null check (coach_message_limit >= 0),
  body_composition_extraction_limit integer not null
    check (body_composition_extraction_limit >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint entitlements_period_valid check (period_end > period_start)
);

alter table public.entitlements
add constraint entitlements_non_overlapping_active_periods
exclude using gist (
  user_id with =,
  tstzrange(period_start, period_end, '[)') with &&
)
where (status in ('trial', 'active'));

create index entitlements_user_period_idx
on public.entitlements(user_id, period_start desc, period_end desc);
create index entitlements_subscription_idx on public.entitlements(subscription_id);

create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  entitlement_id uuid not null references public.entitlements(id) on delete restrict,
  feature text not null
    check (feature in ('plan_generation', 'coach_message', 'body_composition_extraction')),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  attempt_token uuid not null default gen_random_uuid(),
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'failed', 'released')),
  units integer not null default 1 check (units > 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  cached_input_tokens integer check (cached_input_tokens is null or cached_input_tokens >= 0),
  reasoning_tokens integer check (reasoning_tokens is null or reasoning_tokens >= 0),
  provider_cost_microusd bigint check (provider_cost_microusd is null or provider_cost_microusd >= 0),
  created_at timestamptz not null default statement_timestamp(),
  finalized_at timestamptz,
  constraint usage_ledger_idempotent unique (user_id, feature, idempotency_key)
);

create index usage_ledger_quota_idx
on public.usage_ledger(user_id, feature, created_at)
where status in ('reserved', 'completed');
create index usage_ledger_entitlement_idx on public.usage_ledger(entitlement_id);

create table public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  goal_id uuid,
  usage_ledger_id uuid not null references public.usage_ledger(id) on delete restrict,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  status text not null default 'queued'
    check (status in ('queued', 'in_progress', 'completed', 'failed', 'canceled')),
  requested_locale text not null check (requested_locale in ('fa-IR', 'en-US')),
  requested_days smallint not null check (requested_days between 3 and 14),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  request_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(request_metadata) = 'object'),
  prompt_version text not null check (char_length(prompt_version) between 1 and 80),
  model text not null check (char_length(model) between 1 and 120),
  openai_response_id text,
  error_code text,
  error_detail text check (error_detail is null or char_length(error_detail) <= 1000),
  created_at timestamptz not null default statement_timestamp(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint ai_generation_jobs_goal_owned
    foreign key (goal_id, user_id) references public.goals(id, user_id) on delete set null (goal_id),
  constraint ai_generation_jobs_idempotent unique (user_id, idempotency_key),
  constraint ai_generation_jobs_usage_unique unique (usage_ledger_id)
);

create index ai_generation_jobs_user_created_idx
on public.ai_generation_jobs(user_id, created_at desc);

create index ai_generation_jobs_status_created_idx
on public.ai_generation_jobs(status, created_at)
where status in ('queued', 'in_progress');
create index ai_generation_jobs_goal_idx on public.ai_generation_jobs(goal_id);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  goal_id uuid,
  name text not null check (char_length(name) between 1 and 240),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived', 'superseded')),
  valid_from date not null,
  valid_to date not null,
  locale text not null check (locale in ('fa-IR', 'en-US')),
  active_version_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint plans_valid_range check (valid_to >= valid_from),
  constraint plans_max_range check (valid_to - valid_from <= 31),
  constraint plans_goal_owned
    foreign key (goal_id, user_id) references public.goals(id, user_id) on delete set null (goal_id),
  constraint plans_id_user_unique unique (id, user_id)
);

alter table public.plans
add constraint plans_non_overlapping_active_ranges
exclude using gist (
  user_id with =,
  daterange(valid_from, valid_to, '[]') with &&
)
where (status = 'active');

create index plans_user_status_dates_idx
on public.plans(user_id, status, valid_from desc, valid_to desc);
create index plans_goal_idx on public.plans(goal_id);

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  generation_job_id uuid references public.ai_generation_jobs(id) on delete set null,
  version integer not null check (version > 0),
  schema_version text not null check (schema_version ~ '^1\.[0-9]+\.[0-9]+$'),
  source text not null check (source in ('openai', 'coach_revision', 'legacy_import', 'admin')),
  prompt_version text check (prompt_version is null or char_length(prompt_version) <= 80),
  model text check (model is null or char_length(model) <= 120),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  deterministic_health_score smallint
    check (deterministic_health_score is null or deterministic_health_score between 0 and 100),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  constraint plan_versions_plan_owned
    foreign key (plan_id, user_id) references public.plans(id, user_id) on delete cascade,
  constraint plan_versions_number_unique unique (plan_id, version),
  constraint plan_versions_id_user_unique unique (id, user_id),
  constraint plan_versions_content_contract check (
    content ? 'plan_name'
    and content ? 'default_targets'
    and content ? 'days'
    and jsonb_typeof(content -> 'days') = 'array'
  )
);

create index plan_versions_user_created_idx
on public.plan_versions(user_id, created_at desc);
create index plan_versions_job_idx on public.plan_versions(generation_job_id);

alter table public.plans
add constraint plans_active_version_fk
foreign key (active_version_id, user_id)
references public.plan_versions(id, user_id)
deferrable initially deferred;

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  local_date date not null,
  timezone text not null check (char_length(timezone) between 1 and 80),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg between 20 and 500),
  waist_cm numeric(6,2) check (waist_cm is null or waist_cm between 20 and 300),
  sleep_minutes smallint check (sleep_minutes is null or sleep_minutes between 0 and 1440),
  hunger_score smallint check (hunger_score is null or hunger_score between 1 and 5),
  mood_score smallint check (mood_score is null or mood_score between 1 and 5),
  energy_score smallint check (energy_score is null or energy_score between 1 and 5),
  water_ml integer check (water_ml is null or water_ml between 0 and 20000),
  steps integer check (steps is null or steps between 0 and 200000),
  workout jsonb check (workout is null or jsonb_typeof(workout) = 'object'),
  adherence_percent numeric(5,2) check (adherence_percent is null or adherence_percent between 0 and 100),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint daily_checkins_user_date_unique unique (user_id, local_date)
);

create index daily_checkins_user_date_idx
on public.daily_checkins(user_id, local_date desc);

create trigger daily_checkins_set_updated_at
before update on public.daily_checkins
for each row execute function public.set_updated_at();

create table public.daily_meal_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  local_date date not null,
  plan_version_id uuid,
  slot_key text not null check (slot_key ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'),
  option_key text check (option_key is null or option_key ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'),
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  completed_at timestamptz,
  meal_note text check (meal_note is null or char_length(meal_note) <= 1000),
  option_title_snapshot text check (option_title_snapshot is null or char_length(option_title_snapshot) <= 240),
  nutrition_snapshot jsonb check (nutrition_snapshot is null or jsonb_typeof(nutrition_snapshot) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint daily_meal_plan_version_owned
    foreign key (plan_version_id, user_id)
      references public.plan_versions(id, user_id) on delete set null (plan_version_id),
  constraint daily_meal_user_date_slot_unique unique (user_id, local_date, slot_key),
  constraint daily_meal_completed_consistency check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index daily_meal_status_user_date_idx
on public.daily_meal_status(user_id, local_date desc);
create index daily_meal_status_plan_version_idx on public.daily_meal_status(plan_version_id);

create trigger daily_meal_status_set_updated_at
before update on public.daily_meal_status
for each row execute function public.set_updated_at();

create table public.extra_food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  local_date date not null,
  title text not null check (char_length(title) between 1 and 240),
  nutrition jsonb not null check (jsonb_typeof(nutrition) = 'object'),
  source text not null check (source in ('emergency', 'restaurant', 'manual', 'coach')),
  logged_at timestamptz not null default statement_timestamp(),
  notes text check (notes is null or char_length(notes) <= 1000)
);

create index extra_food_logs_user_date_idx
on public.extra_food_logs(user_id, local_date desc, logged_at desc);

create table public.coach_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text check (title is null or char_length(title) <= 120),
  locale text not null check (locale in ('fa-IR', 'en-US')),
  status text not null default 'active' check (status in ('active', 'archived')),
  memory_summary text check (memory_summary is null or char_length(memory_summary) <= 4000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint coach_threads_id_user_unique unique (id, user_id)
);

create index coach_threads_user_updated_idx
on public.coach_threads(user_id, updated_at desc);

create trigger coach_threads_set_updated_at
before update on public.coach_threads
for each row execute function public.set_updated_at();

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  usage_ledger_id uuid references public.usage_ledger(id) on delete restrict,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  safety_level text not null default 'normal' check (safety_level in ('normal', 'caution', 'urgent')),
  safety_reason text check (safety_reason is null or char_length(safety_reason) <= 500),
  suggested_actions text[] not null default '{}',
  openai_response_id text,
  created_at timestamptz not null default statement_timestamp(),
  constraint coach_messages_suggested_actions_limit check (cardinality(suggested_actions) <= 4),
  constraint coach_messages_thread_owned
    foreign key (thread_id, user_id) references public.coach_threads(id, user_id) on delete cascade
);

create index coach_messages_thread_created_idx
on public.coach_messages(thread_id, created_at desc);
create index coach_messages_usage_idx on public.coach_messages(usage_ledger_id);
create unique index coach_messages_usage_unique_idx
on public.coach_messages(usage_ledger_id)
where usage_ledger_id is not null;

create table private.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, route)
);

create table private.ai_circuit_breaker (
  singleton boolean primary key default true check (singleton),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create table private.account_audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  actor_type text not null check (actor_type in ('user', 'service', 'admin')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default statement_timestamp()
);

create index account_audit_events_user_created_idx
on private.account_audit_events(user_id, created_at desc);

create table private.account_mutation_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_payload jsonb not null check (jsonb_typeof(response_payload) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, action, idempotency_key)
);

create or replace function public.consume_api_rate_limit(
  p_user_id uuid,
  p_route text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_count integer;
begin
  if p_user_id is null
    or p_route is null
    or char_length(p_route) not between 1 and 120
    or p_limit < 1
    or p_window_seconds < 1
  then
    raise exception 'invalid_rate_limit_arguments' using errcode = '22023';
  end if;

  insert into private.api_rate_limits(user_id, route, window_started_at, request_count)
  values (p_user_id, p_route, statement_timestamp(), 1)
  on conflict (user_id, route) do update
  set
    window_started_at = case
      when private.api_rate_limits.window_started_at
        <= statement_timestamp() - make_interval(secs => p_window_seconds)
      then statement_timestamp()
      else private.api_rate_limits.window_started_at
    end,
    request_count = case
      when private.api_rate_limits.window_started_at
        <= statement_timestamp() - make_interval(secs => p_window_seconds)
      then 1
      else private.api_rate_limits.request_count + 1
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(uuid, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(uuid, text, integer, integer)
to service_role;

create or replace function public.consume_ai_circuit_breaker(
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_circuit_breaker_arguments' using errcode = '22023';
  end if;

  insert into private.ai_circuit_breaker(singleton, window_started_at, request_count)
  values (true, statement_timestamp(), 1)
  on conflict (singleton) do update
  set
    window_started_at = case
      when private.ai_circuit_breaker.window_started_at
        <= statement_timestamp() - make_interval(secs => p_window_seconds)
      then statement_timestamp()
      else private.ai_circuit_breaker.window_started_at
    end,
    request_count = case
      when private.ai_circuit_breaker.window_started_at
        <= statement_timestamp() - make_interval(secs => p_window_seconds)
      then 1
      else private.ai_circuit_breaker.request_count + 1
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_ai_circuit_breaker(integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_ai_circuit_breaker(integer, integer)
to service_role;

create or replace function public.reserve_ai_request(
  p_user_id uuid,
  p_feature text,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_entitlement public.entitlements%rowtype;
  v_existing public.usage_ledger%rowtype;
  v_used integer;
  v_limit integer;
  v_reservation public.usage_ledger%rowtype;
begin
  if p_user_id is null
    or p_feature not in ('plan_generation', 'coach_message', 'body_composition_extraction')
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_reservation_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from public.usage_ledger
  where user_id = p_user_id
    and feature = p_feature
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'reservation_id', v_existing.id,
      'attempt_token', v_existing.attempt_token,
      'state', case v_existing.status when 'reserved' then 'in_progress' else v_existing.status end
    );
  end if;

  select * into v_entitlement
  from public.entitlements
  where user_id = p_user_id
    and status in ('trial', 'active')
    and statement_timestamp() >= period_start
    and statement_timestamp() < period_end
  order by case status when 'active' then 0 else 1 end, period_end desc
  limit 1
  for update;

  if v_entitlement.id is null then
    raise exception 'entitlement_required' using errcode = 'P0001';
  end if;

  v_limit := case p_feature
    when 'plan_generation' then v_entitlement.plan_generation_limit
    when 'coach_message' then v_entitlement.coach_message_limit
    else v_entitlement.body_composition_extraction_limit
  end;

  select coalesce(sum(units), 0)::integer into v_used
  from public.usage_ledger
  where user_id = p_user_id
    and entitlement_id = v_entitlement.id
    and feature = p_feature
    and status in ('reserved', 'completed');

  if v_used >= v_limit then
    raise exception 'quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.usage_ledger(
    user_id,
    entitlement_id,
    feature,
    idempotency_key,
    request_sha256,
    status,
    units
  ) values (
    p_user_id,
    v_entitlement.id,
    p_feature,
    p_idempotency_key,
    p_request_sha256,
    'reserved',
    1
  )
  returning * into v_reservation;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'attempt_token', v_reservation.attempt_token,
    'state', 'new'
  );
exception
  when unique_violation then
    select * into v_existing
    from public.usage_ledger
    where user_id = p_user_id
      and feature = p_feature
      and idempotency_key = p_idempotency_key;
    if v_existing.id is null then
      raise;
    end if;
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'reservation_id', v_existing.id,
      'attempt_token', v_existing.attempt_token,
      'state', case v_existing.status when 'reserved' then 'in_progress' else v_existing.status end
    );
end;
$$;

revoke all on function public.reserve_ai_request(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid, text, text, text)
to service_role;

create or replace function public.finalize_ai_request(
  p_reservation_id uuid,
  p_attempt_token uuid,
  p_status text,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_cached_input_tokens integer default null,
  p_reasoning_tokens integer default null,
  p_provider_cost_microusd bigint default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('completed', 'failed', 'released') then
    raise exception 'invalid_usage_status' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.usage_ledger
    where id = p_reservation_id
      and attempt_token = p_attempt_token
      and status = p_status
  ) then
    return;
  end if;

  update public.usage_ledger
  set
    status = p_status,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    cached_input_tokens = p_cached_input_tokens,
    reasoning_tokens = p_reasoning_tokens,
    provider_cost_microusd = p_provider_cost_microusd,
    finalized_at = statement_timestamp()
  where id = p_reservation_id
    and attempt_token = p_attempt_token
    and status = 'reserved';

  if not found then
    raise exception 'usage_reservation_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.finalize_ai_request(uuid, uuid, text, integer, integer, integer, integer, bigint)
from public, anon, authenticated;
grant execute on function public.finalize_ai_request(uuid, uuid, text, integer, integer, integer, integer, bigint)
to service_role;

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

  if v_job.id is null or v_job.status <> 'in_progress' then
    raise exception 'generation_job_not_in_progress' using errcode = 'P0001';
  end if;

  update public.plans
  set status = 'archived'
  where user_id = p_user_id
    and status = 'active'
    and daterange(valid_from, valid_to, '[]') && daterange(p_valid_from, p_valid_to, '[]');

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
    p_valid_from,
    p_valid_to,
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
  set active_version_id = v_version_id, status = 'active'
  where id = v_plan_id;

  update public.ai_generation_jobs
  set
    status = 'completed',
    openai_response_id = p_openai_response_id,
    finished_at = statement_timestamp()
  where id = p_job_id;

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'plan.generated',
    'service',
    jsonb_build_object('plan_id', v_plan_id, 'plan_version_id', v_version_id, 'job_id', p_job_id)
  );

  return jsonb_build_object('plan_id', v_plan_id, 'plan_version_id', v_version_id);
end;
$$;

revoke all on function public.persist_generated_plan(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_generated_plan(
  uuid, uuid, uuid, text, date, date, text, text, text, text, text, jsonb, text
) to service_role;

create or replace function public.complete_onboarding(
  p_user_id uuid,
  p_idempotency_key text,
  p_terms_version text,
  p_privacy_version text,
  p_health_consent_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_draft public.onboarding_drafts%rowtype;
  v_existing private.account_mutation_keys%rowtype;
  v_payload jsonb;
  v_request_sha256 text;
  v_birth_date date;
  v_age integer;
  v_height numeric;
  v_weight numeric;
  v_target_weight numeric;
  v_training_days integer;
  v_training_duration integer;
  v_training_weekdays smallint[];
  v_training_start_time time;
  v_preferred_option_count integer;
  v_restaurant_meals integer;
  v_country text;
  v_locale text;
  v_timezone text;
  v_sex text;
  v_goal_type text;
  v_budget_tier text;
  v_activity_type text;
  v_onboarding_status text;
  v_block_reason text;
  v_goal_id uuid;
  v_email_confirmed_at timestamptz;
  v_ai_country_verified boolean;
  v_existing_onboarding_status text;
  v_existing_block_reason text;
  v_response jsonb;
begin
  if p_user_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or char_length(p_terms_version) not between 1 and 80
    or char_length(p_privacy_version) not between 1 and 80
    or char_length(p_health_consent_version) not between 1 and 80
  then
    raise exception 'invalid_onboarding_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'complete-onboarding'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    return v_existing.response_payload;
  end if;

  select email_confirmed_at into v_email_confirmed_at
  from auth.users
  where id = p_user_id;
  if v_email_confirmed_at is null then
    raise exception 'email_confirmation_required' using errcode = 'P0001';
  end if;

  select * into v_draft
  from public.onboarding_drafts
  where user_id = p_user_id
  for update;

  if v_draft.user_id is null then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'complete-onboarding'
      and idempotency_key = p_idempotency_key;
    if v_existing.user_id is not null then
      return v_existing.response_payload;
    end if;
    raise exception 'onboarding_draft_not_found' using errcode = 'P0002';
  end if;

  v_payload := v_draft.payload;
  v_request_sha256 := encode(
    extensions.digest(
      v_payload::text || ':' || p_terms_version || ':' || p_privacy_version || ':' ||
        p_health_consent_version,
      'sha256'
    ),
    'hex'
  );

  if char_length(trim(coalesce(v_payload ->> 'firstName', ''))) not between 1 and 120
    or coalesce(v_payload ->> 'birthDate', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(v_payload ->> 'heightCm', '') !~ '^\d+(\.\d+)?$'
    or coalesce(v_payload ->> 'weightKg', '') !~ '^\d+(\.\d+)?$'
    or coalesce(v_payload ->> 'trainingDays', '') !~ '^\d+$'
    or coalesce(v_payload ->> 'sex', '') not in ('female', 'male', 'undisclosed', 'other')
    or coalesce(v_payload ->> 'goalType', '') not in ('fat_loss', 'muscle_gain', 'maintenance')
    or coalesce(v_payload ->> 'dietStyle', '') not in ('omnivore', 'vegetarian')
    or coalesce(v_payload ->> 'foodBudget', '') not in ('budget', 'standard', 'flexible')
    or char_length(trim(coalesce(v_payload ->> 'workSchedule', ''))) not between 1 and 1000
    or char_length(trim(coalesce(v_payload ->> 'favoriteFoods', ''))) not between 1 and 4000
    or char_length(trim(coalesce(v_payload ->> 'requestedMealPattern', ''))) not between 1 and 500
    or char_length(trim(coalesce(v_payload ->> 'cookingConstraints', ''))) not between 1 and 4000
    or char_length(trim(coalesce(v_payload ->> 'groceryPreferences', ''))) not between 1 and 4000
    or coalesce(v_payload ->> 'preferredOptionCount', '') !~ '^\d+$'
    or coalesce(v_payload ->> 'restaurantMealsPerWeek', '') !~ '^\d+$'
    or coalesce(v_payload ->> 'adultConfirmed', '') not in ('yes', 'no')
    or coalesce(v_payload ->> 'pregnancyOrBreastfeeding', '') not in ('yes', 'no')
    or coalesce(v_payload ->> 'eatingDisorderHistory', '') not in ('yes', 'no')
    or coalesce(v_payload ->> 'highRiskCondition', '') not in ('yes', 'no')
    or coalesce(v_payload ->> 'locale', '') not in ('fa-IR', 'en-US')
    or char_length(trim(coalesce(v_payload ->> 'timezone', ''))) not between 1 and 80
    or coalesce(v_payload ->> 'timezone', '') !~ '^[A-Za-z0-9_+:-]+(/[A-Za-z0-9_+:-]+)*$'
    or coalesce(v_payload ->> 'termsAccepted', '') not in ('yes', 'true')
    or coalesce(v_payload ->> 'privacyAccepted', '') not in ('yes', 'true')
    or coalesce(v_payload ->> 'healthDataConsent', '') not in ('yes', 'true')
  then
    raise exception 'onboarding_draft_invalid' using errcode = '22023';
  end if;

  begin
    v_birth_date := (v_payload ->> 'birthDate')::date;
    v_height := (v_payload ->> 'heightCm')::numeric;
    v_weight := (v_payload ->> 'weightKg')::numeric;
    v_training_days := (v_payload ->> 'trainingDays')::integer;
    v_preferred_option_count := (v_payload ->> 'preferredOptionCount')::integer;
    v_restaurant_meals := (v_payload ->> 'restaurantMealsPerWeek')::integer;
    v_target_weight := coalesce(
      case
        when coalesce(v_payload ->> 'targetWeightKg', '') ~ '^\d+(\.\d+)?$'
        then (v_payload ->> 'targetWeightKg')::numeric
      end,
      v_weight
    );
  exception when others then
    raise exception 'onboarding_draft_invalid' using errcode = '22023';
  end;

  if v_birth_date > current_date
    or v_birth_date < current_date - interval '100 years'
    or v_height not between 120 and 230
    or v_weight not between 35 and 350
    or v_target_weight not between 35 and 350
    or v_training_days not between 0 and 7
    or v_preferred_option_count not between 1 and 6
    or v_restaurant_meals not between 0 and 21
  then
    raise exception 'onboarding_draft_invalid' using errcode = '22023';
  end if;

  if v_payload ->> 'goalType' <> 'maintenance'
    and (
      coalesce(v_payload ->> 'targetWeightKg', '') !~ '^\d+(\.\d+)?$'
      or v_target_weight not between 35 and 350
    )
  then
    raise exception 'onboarding_draft_invalid' using errcode = '22023';
  end if;

  if v_restaurant_meals > 0
    and char_length(trim(coalesce(v_payload ->> 'restaurantPreferences', ''))) not between 1 and 4000
  then
    raise exception 'onboarding_draft_invalid' using errcode = '22023';
  end if;

  if v_training_days > 0 then
    if coalesce(v_payload ->> 'primaryActivity', '') not in ('strength', 'crossfit', 'cardio', 'mixed')
      or coalesce(v_payload ->> 'trainingWeekdays', '') !~ '^[0-6](,[0-6])*$'
      or coalesce(v_payload ->> 'trainingStartTime', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
      or coalesce(v_payload ->> 'trainingDuration', '') !~ '^\d+$'
      or char_length(trim(coalesce(v_payload ->> 'trainingAvailability', ''))) not between 1 and 1000
    then
      raise exception 'onboarding_draft_invalid' using errcode = '22023';
    end if;

    begin
      v_training_duration := (v_payload ->> 'trainingDuration')::integer;
      v_training_start_time := (v_payload ->> 'trainingStartTime')::time;
      v_training_weekdays := string_to_array(v_payload ->> 'trainingWeekdays', ',')::smallint[];
    exception when others then
      raise exception 'onboarding_draft_invalid' using errcode = '22023';
    end;

    if v_training_duration not between 10 and 300
      or cardinality(v_training_weekdays) <> v_training_days
      or (select count(distinct day) from unnest(v_training_weekdays) day) <> v_training_days
    then
      raise exception 'onboarding_draft_invalid' using errcode = '22023';
    end if;
  else
    v_activity_type := 'rest';
    v_training_weekdays := '{}';
  end if;

  v_country := upper(coalesce(v_payload ->> 'country', ''));
  if v_country !~ '^[A-Z]{2}$' then
    raise exception 'verified_country_required' using errcode = '22023';
  end if;
  v_locale := v_payload ->> 'locale';
  v_timezone := trim(v_payload ->> 'timezone');

  select onboarding_status, automation_block_reason
  into v_existing_onboarding_status, v_existing_block_reason
  from public.profiles
  where user_id = p_user_id
  for update;

  v_age := date_part('year', age(current_date, v_birth_date))::integer;
  v_block_reason := case
    when v_existing_onboarding_status = 'automation_blocked'
      then coalesce(v_existing_block_reason, 'manual_review_required')
    when v_age < 18 or v_payload ->> 'adultConfirmed' <> 'yes' then 'minor_or_adult_unconfirmed'
    when v_payload ->> 'pregnancyOrBreastfeeding' = 'yes' then 'pregnancy_or_breastfeeding'
    when v_payload ->> 'eatingDisorderHistory' = 'yes' then 'eating_disorder_history'
    when v_payload ->> 'highRiskCondition' = 'yes' then 'high_risk_condition'
    else null
  end;
  v_onboarding_status := case when v_block_reason is null then 'complete' else 'automation_blocked' end;
  v_sex := case v_payload ->> 'sex'
    when 'undisclosed' then 'prefer_not_to_say'
    else v_payload ->> 'sex'
  end;
  v_goal_type := v_payload ->> 'goalType';
  v_budget_tier := case v_payload ->> 'foodBudget'
    when 'budget' then 'low'
    when 'flexible' then 'high'
    else 'medium'
  end;
  v_activity_type := case coalesce(v_payload ->> 'primaryActivity', 'none')
    when 'mixed' then 'full_body'
    when 'none' then 'rest'
    else v_payload ->> 'primaryActivity'
  end;

  update public.profiles
  set
    display_name = trim(v_payload ->> 'firstName'),
    date_of_birth = v_birth_date,
    sex = v_sex,
    height_cm = v_height,
    country_code = v_country,
    pricing_market = case when v_country = 'IR' then 'ir' else 'global' end,
    locale = v_locale,
    timezone = v_timezone,
    onboarding_status = v_onboarding_status,
    automation_block_reason = v_block_reason,
    terms_accepted_at = statement_timestamp(),
    terms_version = p_terms_version,
    privacy_accepted_at = statement_timestamp(),
    privacy_version = p_privacy_version,
    health_data_consent_at = statement_timestamp(),
    health_consent_version = p_health_consent_version
  where user_id = p_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  select (
    ai_billing_country_code is not null
    and ai_country_verified_at is not null
    and ai_country_verification_method is not null
  ) into v_ai_country_verified
  from public.profiles
  where user_id = p_user_id;

  update public.goals
  set
    goal_type = v_goal_type,
    custom_goal = null,
    start_weight_kg = v_weight,
    target_weight_kg = v_target_weight,
    journey_start_date = current_date,
    target_date = current_date + 84,
    updated_at = statement_timestamp()
  where user_id = p_user_id and status = 'active'
  returning id into v_goal_id;

  if v_goal_id is null then
    insert into public.goals(
      user_id,
      goal_type,
      start_weight_kg,
      target_weight_kg,
      journey_start_date,
      target_date,
      status
    ) values (
      p_user_id,
      v_goal_type,
      v_weight,
      v_target_weight,
      current_date,
      current_date + 84,
      'active'
    ) returning id into v_goal_id;
  end if;

  insert into public.dietary_preferences(
    user_id,
    dietary_pattern,
    favorite_foods,
    disliked_foods,
    allergies,
    requested_meal_pattern,
    preferred_option_count,
    cooking_constraints,
    available_equipment,
    work_schedule,
    budget_tier,
    restaurant_meals_per_week,
    restaurant_preferences,
    grocery_preferences,
    cuisine_region
  ) values (
    p_user_id,
    v_payload ->> 'dietStyle',
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'favoriteFoods', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'dislikedFoods', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'allergies', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    left(trim(v_payload ->> 'requestedMealPattern'), 500),
    v_preferred_option_count,
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'cookingConstraints', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'equipment', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    left(trim(v_payload ->> 'workSchedule'), 1000),
    v_budget_tier,
    v_restaurant_meals,
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'restaurantPreferences', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'groceryPreferences', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    case when v_country = 'IR' then 'iran' else 'international' end
  )
  on conflict (user_id) do update
  set
    dietary_pattern = excluded.dietary_pattern,
    favorite_foods = excluded.favorite_foods,
    disliked_foods = excluded.disliked_foods,
    allergies = excluded.allergies,
    requested_meal_pattern = excluded.requested_meal_pattern,
    preferred_option_count = excluded.preferred_option_count,
    cooking_constraints = excluded.cooking_constraints,
    available_equipment = excluded.available_equipment,
    work_schedule = excluded.work_schedule,
    budget_tier = excluded.budget_tier,
    restaurant_meals_per_week = excluded.restaurant_meals_per_week,
    restaurant_preferences = excluded.restaurant_preferences,
    grocery_preferences = excluded.grocery_preferences,
    cuisine_region = excluded.cuisine_region,
    updated_at = statement_timestamp();

  insert into public.health_context(user_id, medical_considerations, medications, supplements, clinician_notes)
  values (
    p_user_id,
    array_remove(array[
      case when v_payload ->> 'pregnancyOrBreastfeeding' = 'yes' then 'pregnancy_or_breastfeeding' end,
      case when v_payload ->> 'eatingDisorderHistory' = 'yes' then 'eating_disorder_history' end,
      case when v_payload ->> 'highRiskCondition' = 'yes' then 'high_risk_condition' end
    ], null),
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'medications', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    array(
      select left(trim(item), 160)
      from unnest(regexp_split_to_array(coalesce(v_payload ->> 'supplements', ''), '[,;\n]+')) item
      where trim(item) <> '' limit 50
    ),
    nullif(left(trim(coalesce(v_payload ->> 'medicalNotes', '')), 2000), '')
  )
  on conflict (user_id) do update
  set
    medical_considerations = excluded.medical_considerations,
    medications = excluded.medications,
    supplements = excluded.supplements,
    clinician_notes = excluded.clinician_notes,
    updated_at = statement_timestamp();

  delete from public.training_schedule_items where user_id = p_user_id;
  if v_training_days > 0 and v_activity_type <> 'rest' then
    insert into public.training_schedule_items(
      user_id,
      weekday,
      activity_type,
      local_start_time,
      duration_minutes,
      intensity,
      notes
    )
    select
      p_user_id,
      weekday,
      v_activity_type,
      v_training_start_time,
      v_training_duration,
      'moderate',
      left(trim(v_payload ->> 'trainingAvailability'), 500)
    from unnest(v_training_weekdays) weekday;
  end if;

  if v_country <> 'IR' and v_onboarding_status = 'complete' and not exists (
    select 1 from public.entitlements
    where user_id = p_user_id
      and status in ('trial', 'active')
      and statement_timestamp() >= period_start
      and statement_timestamp() < period_end
  ) and not exists (
    select 1 from public.entitlements
    where user_id = p_user_id and source = 'trial'
  ) then
    insert into public.entitlements(
      user_id,
      source,
      status,
      period_start,
      period_end,
      plan_generation_limit,
      coach_message_limit,
      body_composition_extraction_limit
    ) values (
      p_user_id,
      'trial',
      'trial',
      statement_timestamp(),
      statement_timestamp() + interval '7 days',
      1,
      10,
      1
    );
  end if;

  v_response := jsonb_build_object(
    'status', v_onboarding_status,
    'automation_block_reason', v_block_reason,
    'goal_id', v_goal_id,
    'country_code', v_country,
    'ai_country_verified', coalesce(v_ai_country_verified, false),
    'consent_versions', jsonb_build_object(
      'terms', p_terms_version,
      'privacy', p_privacy_version,
      'health', p_health_consent_version
    )
  );

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'onboarding.completed',
    'service',
    jsonb_build_object('status', v_onboarding_status, 'block_reason', v_block_reason)
  );

  insert into private.account_mutation_keys(
    user_id,
    action,
    idempotency_key,
    request_sha256,
    response_payload
  ) values (
    p_user_id,
    'complete-onboarding',
    p_idempotency_key,
    v_request_sha256,
    v_response
  );

  return v_response;
end;
$$;

revoke all on function public.complete_onboarding(uuid, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.complete_onboarding(uuid, text, text, text, text)
to service_role;

create or replace function private.current_profile_local_date(p_user_id uuid)
returns date
language plpgsql
stable
security definer
set search_path = public, private, pg_catalog, pg_temp
as $$
declare
  v_timezone text;
begin
  select timezone into v_timezone
  from public.profiles
  where user_id = p_user_id;

  if v_timezone is null then
    raise exception 'profile_timezone_unavailable' using errcode = 'P0002';
  end if;

  return (statement_timestamp() at time zone v_timezone)::date;
end;
$$;

revoke all on function private.current_profile_local_date(uuid)
from public, anon, authenticated;
grant execute on function private.current_profile_local_date(uuid)
to service_role;

create or replace function public.select_meal_option(
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
  v_plan public.plans%rowtype;
  v_content jsonb;
  v_day jsonb;
  v_meal jsonb;
  v_option jsonb;
  v_status public.daily_meal_status%rowtype;
  v_response jsonb;
  v_day_index integer;
begin
  if p_user_id is null
    or p_local_date is null
    or p_slot_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or p_option_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_select_meal_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'select-meal'
    and idempotency_key = p_idempotency_key;

  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'meal_date_not_current' using errcode = 'P0001';
  end if;

  select * into v_plan
  from public.plans
  where user_id = p_user_id
    and status = 'active'
    and p_local_date between valid_from and valid_to
  limit 1
  for update;

  if v_plan.id is null or v_plan.active_version_id is null then
    raise exception 'active_plan_not_found' using errcode = 'P0002';
  end if;

  select content into v_content
  from public.plan_versions
  where id = v_plan.active_version_id and user_id = p_user_id;

  v_day_index := p_local_date - v_plan.valid_from;
  select item into v_day
  from jsonb_array_elements(v_content -> 'days') as day(item)
  where (item ->> 'day_index')::integer = v_day_index
  limit 1;

  if v_day is null then
    raise exception 'plan_day_not_found' using errcode = 'P0002';
  end if;

  select item into v_meal
  from jsonb_array_elements(v_day -> 'meals') as meal(item)
  where item ->> 'slot_key' = p_slot_key
  limit 1;

  if v_meal is null then
    raise exception 'meal_slot_not_found' using errcode = 'P0002';
  end if;

  select item into v_option
  from jsonb_array_elements(v_meal -> 'options') as meal_option(item)
  where item ->> 'option_key' = p_option_key
  limit 1;

  if v_option is null then
    raise exception 'meal_option_not_found' using errcode = 'P0002';
  end if;

  select * into v_status
  from public.daily_meal_status
  where user_id = p_user_id
    and local_date = p_local_date
    and slot_key = p_slot_key
  for update;

  if v_status.id is not null and v_status.status = 'completed' then
    if v_status.option_key <> p_option_key then
      raise exception 'completed_meal_locked' using errcode = 'P0001';
    end if;
  else
    insert into public.daily_meal_status(
      user_id,
      local_date,
      plan_version_id,
      slot_key,
      option_key,
      status,
      completed_at,
      option_title_snapshot,
      nutrition_snapshot
    ) values (
      p_user_id,
      p_local_date,
      v_plan.active_version_id,
      p_slot_key,
      p_option_key,
      'planned',
      null,
      v_option ->> 'title',
      v_option -> 'nutrition'
    )
    on conflict (user_id, local_date, slot_key) do update
    set
      plan_version_id = excluded.plan_version_id,
      option_key = excluded.option_key,
      option_title_snapshot = excluded.option_title_snapshot,
      nutrition_snapshot = excluded.nutrition_snapshot,
      updated_at = statement_timestamp()
    returning * into v_status;
  end if;

  v_response := jsonb_build_object(
    'id', v_status.id,
    'local_date', v_status.local_date,
    'plan_version_id', v_status.plan_version_id,
    'slot_key', v_status.slot_key,
    'option_key', v_status.option_key,
    'status', v_status.status,
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
    'select-meal',
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
      and action = 'select-meal'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.select_meal_option(uuid, date, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.select_meal_option(uuid, date, text, text, text, text)
to service_role;

create or replace function private.resolve_active_meal_option(
  p_user_id uuid,
  p_local_date date,
  p_slot_key text,
  p_option_key text
)
returns table(plan_version_id uuid, option_title text, nutrition jsonb)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_plan public.plans%rowtype;
  v_content jsonb;
  v_day jsonb;
  v_meal jsonb;
  v_option jsonb;
begin
  select * into v_plan
  from public.plans
  where user_id = p_user_id
    and status = 'active'
    and p_local_date between valid_from and valid_to
  limit 1
  for update;

  if v_plan.id is null or v_plan.active_version_id is null then
    raise exception 'active_plan_not_found' using errcode = 'P0002';
  end if;

  select content into v_content
  from public.plan_versions
  where id = v_plan.active_version_id and user_id = p_user_id;

  select item into v_day
  from jsonb_array_elements(v_content -> 'days') as day(item)
  where (item ->> 'day_index')::integer = p_local_date - v_plan.valid_from
  limit 1;
  if v_day is null then
    raise exception 'plan_day_not_found' using errcode = 'P0002';
  end if;

  select item into v_meal
  from jsonb_array_elements(v_day -> 'meals') as meal(item)
  where item ->> 'slot_key' = p_slot_key
  limit 1;
  if v_meal is null then
    raise exception 'meal_slot_not_found' using errcode = 'P0002';
  end if;

  select item into v_option
  from jsonb_array_elements(v_meal -> 'options') as meal_option(item)
  where item ->> 'option_key' = p_option_key
  limit 1;
  if v_option is null then
    raise exception 'meal_option_not_found' using errcode = 'P0002';
  end if;

  return query select
    v_plan.active_version_id,
    v_option ->> 'title',
    v_option -> 'nutrition';
end;
$$;

revoke all on function private.resolve_active_meal_option(uuid, date, text, text)
from public, anon, authenticated;
grant execute on function private.resolve_active_meal_option(uuid, date, text, text)
to service_role;

create or replace function public.complete_meal_option(
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
  v_resolved record;
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
    raise exception 'invalid_complete_meal_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'complete-meal'
    and idempotency_key = p_idempotency_key;

  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'meal_date_not_current' using errcode = 'P0001';
  end if;

  select * into v_resolved
  from private.resolve_active_meal_option(
    p_user_id,
    p_local_date,
    p_slot_key,
    p_option_key
  );

  select * into v_status
  from public.daily_meal_status
  where user_id = p_user_id
    and local_date = p_local_date
    and slot_key = p_slot_key
  for update;

  if v_status.id is not null
    and v_status.status = 'completed'
    and v_status.option_key <> p_option_key
  then
    raise exception 'completed_meal_locked' using errcode = 'P0001';
  end if;

  insert into public.daily_meal_status(
    user_id,
    local_date,
    plan_version_id,
    slot_key,
    option_key,
    status,
    completed_at,
    option_title_snapshot,
    nutrition_snapshot
  ) values (
    p_user_id,
    p_local_date,
    v_resolved.plan_version_id,
    p_slot_key,
    p_option_key,
    'completed',
    statement_timestamp(),
    v_resolved.option_title,
    v_resolved.nutrition
  )
  on conflict (user_id, local_date, slot_key) do update
  set
    plan_version_id = excluded.plan_version_id,
    option_key = excluded.option_key,
    status = 'completed',
    completed_at = coalesce(public.daily_meal_status.completed_at, statement_timestamp()),
    option_title_snapshot = excluded.option_title_snapshot,
    nutrition_snapshot = excluded.nutrition_snapshot,
    updated_at = statement_timestamp()
  returning * into v_status;

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
    'complete-meal',
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
      and action = 'complete-meal'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.complete_meal_option(uuid, date, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.complete_meal_option(uuid, date, text, text, text, text)
to service_role;

create or replace function public.confirm_body_composition(
  p_user_id uuid,
  p_measurement_id uuid,
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
  v_measurement public.body_composition_measurements%rowtype;
  v_response jsonb;
begin
  if p_user_id is null
    or p_measurement_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_body_confirmation_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'confirm-body-composition'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  select * into v_measurement
  from public.body_composition_measurements
  where id = p_measurement_id and user_id = p_user_id
  for update;

  if v_measurement.id is null then
    raise exception 'body_measurement_not_found' using errcode = 'P0002';
  end if;
  if v_measurement.extraction_status not in ('needs_confirmation', 'confirmed')
    or v_measurement.extraction_result is null
  then
    raise exception 'body_measurement_not_confirmable' using errcode = 'P0001';
  end if;

  if v_measurement.extraction_status = 'needs_confirmation' then
    update public.body_composition_measurements
    set extraction_status = 'confirmed'
    where id = p_measurement_id and user_id = p_user_id
    returning * into v_measurement;
  end if;

  v_response := jsonb_build_object(
    'id', v_measurement.id,
    'measured_at', v_measurement.measured_at,
    'extraction_status', v_measurement.extraction_status,
    'weight_kg', v_measurement.weight_kg,
    'body_fat_percent', v_measurement.body_fat_percent,
    'fat_mass_kg', v_measurement.fat_mass_kg,
    'lean_mass_kg', v_measurement.lean_mass_kg,
    'skeletal_muscle_mass_kg', v_measurement.skeletal_muscle_mass_kg,
    'visceral_fat_rating', v_measurement.visceral_fat_rating,
    'waist_cm', v_measurement.waist_cm,
    'basal_metabolic_rate_kcal', v_measurement.basal_metabolic_rate_kcal,
    'updated_at', v_measurement.updated_at
  );

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'body_composition.confirmed',
    'service',
    jsonb_build_object('measurement_id', p_measurement_id)
  );

  insert into private.account_mutation_keys(
    user_id,
    action,
    idempotency_key,
    request_sha256,
    response_payload
  ) values (
    p_user_id,
    'confirm-body-composition',
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
      and action = 'confirm-body-composition'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.confirm_body_composition(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.confirm_body_composition(uuid, uuid, text, text)
to service_role;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_locale text;
  v_country text;
begin
  v_locale := case
    when new.raw_user_meta_data ->> 'locale' = 'en-US' then 'en-US'
    else 'fa-IR'
  end;
  v_country := upper(nullif(new.raw_user_meta_data ->> 'country_code', ''));

  insert into public.profiles(
    user_id,
    display_name,
    locale,
    timezone,
    country_code,
    pricing_market
  ) values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120),
    v_locale,
    case when v_locale = 'fa-IR' then 'Asia/Tehran' else 'UTC' end,
    case when v_country ~ '^[A-Z]{2}$' then v_country else null end,
    case when v_country = 'IR' then 'ir' else 'global' end
  );

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.onboarding_drafts enable row level security;
alter table public.goals enable row level security;
alter table public.dietary_preferences enable row level security;
alter table public.health_context enable row level security;
alter table public.body_composition_measurements enable row level security;
alter table public.training_schedule_items enable row level security;
alter table public.product_prices enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.ai_generation_jobs enable row level security;
alter table public.plans enable row level security;
alter table public.plan_versions enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.daily_meal_status enable row level security;
alter table public.extra_food_logs enable row level security;
alter table public.coach_threads enable row level security;
alter table public.coach_messages enable row level security;

revoke all on table
  public.profiles,
  public.onboarding_drafts,
  public.goals,
  public.dietary_preferences,
  public.health_context,
  public.body_composition_measurements,
  public.training_schedule_items,
  public.product_prices,
  public.subscriptions,
  public.entitlements,
  public.usage_ledger,
  public.ai_generation_jobs,
  public.plans,
  public.plan_versions,
  public.daily_checkins,
  public.daily_meal_status,
  public.extra_food_logs,
  public.coach_threads,
  public.coach_messages
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (
  display_name,
  date_of_birth,
  sex,
  height_cm,
  locale,
  timezone,
  unit_system
) on public.profiles to authenticated;
grant select, insert, update, delete on public.onboarding_drafts to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.dietary_preferences to authenticated;
grant select, insert, update, delete on public.health_context to authenticated;
grant select, delete on public.body_composition_measurements to authenticated;
grant insert (
  user_id,
  measured_at,
  source_type,
  weight_kg,
  body_fat_percent,
  fat_mass_kg,
  lean_mass_kg,
  skeletal_muscle_mass_kg,
  visceral_fat_rating,
  waist_cm,
  basal_metabolic_rate_kcal,
  notes,
  report_object_path,
  extraction_status
) on public.body_composition_measurements to authenticated;
grant update (
  measured_at,
  weight_kg,
  body_fat_percent,
  fat_mass_kg,
  lean_mass_kg,
  skeletal_muscle_mass_kg,
  visceral_fat_rating,
  waist_cm,
  basal_metabolic_rate_kcal,
  notes
) on public.body_composition_measurements to authenticated;
grant select, insert, update, delete on public.training_schedule_items to authenticated;
grant select on public.product_prices to anon, authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.entitlements to authenticated;
grant select on public.usage_ledger to authenticated;
grant select on public.ai_generation_jobs to authenticated;
grant select on public.plans to authenticated;
grant select, insert, update, delete on public.daily_checkins to authenticated;
grant select on public.daily_meal_status to authenticated;
grant select, insert, update, delete on public.extra_food_logs to authenticated;
grant select on public.coach_threads to authenticated;
grant select on public.coach_messages to authenticated;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy onboarding_drafts_manage_own
on public.onboarding_drafts for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy goals_manage_own
on public.goals for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy dietary_preferences_manage_own
on public.dietary_preferences for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy health_context_manage_own
on public.health_context for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy body_composition_manage_own
on public.body_composition_measurements for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy training_schedule_manage_own
on public.training_schedule_items for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy product_prices_read_active
on public.product_prices for select to anon, authenticated
using (
  active
  and (starts_at is null or starts_at <= statement_timestamp())
  and (ends_at is null or ends_at > statement_timestamp())
);

create policy subscriptions_select_own
on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

create policy entitlements_select_own
on public.entitlements for select to authenticated
using ((select auth.uid()) = user_id);

create policy usage_ledger_select_own
on public.usage_ledger for select to authenticated
using ((select auth.uid()) = user_id);

create policy ai_generation_jobs_select_own
on public.ai_generation_jobs for select to authenticated
using ((select auth.uid()) = user_id);

create policy plans_select_own
on public.plans for select to authenticated
using ((select auth.uid()) = user_id);

create policy daily_checkins_manage_own
on public.daily_checkins for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy daily_meal_status_select_own
on public.daily_meal_status for select to authenticated
using ((select auth.uid()) = user_id);

create policy extra_food_logs_manage_own
on public.extra_food_logs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy coach_threads_select_own
on public.coach_threads for select to authenticated
using ((select auth.uid()) = user_id);

create policy coach_messages_select_own
on public.coach_messages for select to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'body-composition',
  'body-composition',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists body_composition_select_own on storage.objects;
create policy body_composition_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'body-composition'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists body_composition_insert_own on storage.objects;
create policy body_composition_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'body-composition'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists body_composition_update_own on storage.objects;
create policy body_composition_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'body-composition'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'body-composition'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists body_composition_delete_own on storage.objects;
create policy body_composition_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'body-composition'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

comment on schema private is 'Service-only tables and functions; never expose through the Data API.';
comment on table public.plan_versions is 'Immutable, validated AI/imported plan documents. Raw content is service-only; clients receive projections.';
comment on table public.health_context is 'Sensitive health context. Do not include values in logs or analytics.';
comment on table public.usage_ledger is 'Server-authored AI quota and provider usage ledger.';

commit;
