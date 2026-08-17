begin;

-- Phase 1B: align live schema/RLS with the Phase 0 contract.
-- Do not rewrite 202607310001 in place. Coach, Core/Pro, 7-day trial,
-- plan recalibration, body-extraction AI, and the Iran geo-block wall are drift.

-- ---------------------------------------------------------------------------
-- 1. Drop coach / recalibration / body-extraction product paths
-- ---------------------------------------------------------------------------
drop function if exists public.persist_coach_reply_and_finalize(
  uuid, uuid, uuid, uuid, text, text, text, text[], text,
  integer, integer, integer, integer
);
drop function if exists public.create_plan_recalibration_preview(
  uuid, uuid, uuid, jsonb, text, jsonb, jsonb, jsonb, text, text, text
);
drop function if exists public.confirm_plan_recalibration(uuid, uuid, text, text);
drop function if exists public.rollback_plan_recalibration(uuid, uuid, text, text);
drop function if exists public.persist_body_extraction_and_finalize(
  uuid, uuid, uuid, uuid, jsonb, jsonb, integer, integer, integer, integer
);

drop table if exists public.coach_messages;
drop table if exists public.coach_threads;
drop table if exists public.plan_recalibrations;

delete from public.ai_safety_reports where surface in ('coach', 'body_extraction');
alter table public.ai_safety_reports drop constraint if exists ai_safety_reports_surface_check;
alter table public.ai_safety_reports
  add constraint ai_safety_reports_surface_check check (surface = 'plan');

create or replace function public.submit_ai_safety_report(
  p_surface text,
  p_reference_id uuid,
  p_reason_code text,
  p_details text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_report public.ai_safety_reports%rowtype;
  v_owned boolean := false;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_surface <> 'plan' then raise exception 'invalid_report_surface'; end if;
  if p_reason_code not in (
    'unsafe_or_inappropriate', 'medical_advice', 'eating_disorder', 'unsafe_exercise',
    'body_shame', 'self_harm', 'privacy', 'incorrect_output', 'other'
  ) then raise exception 'invalid_report_reason'; end if;
  if p_details is not null and char_length(p_details) > 1000 then raise exception 'report_details_too_long'; end if;

  select exists(
    select 1 from public.plan_versions where id = p_reference_id and user_id = v_user_id
  ) into v_owned;
  if not v_owned then raise exception 'report_reference_not_found'; end if;

  insert into public.ai_safety_reports(user_id, surface, reference_id, reason_code, details)
  values (v_user_id, p_surface, p_reference_id, p_reason_code, nullif(trim(p_details), ''))
  returning * into v_report;
  return jsonb_build_object(
    'id', v_report.id, 'surface', v_report.surface, 'reference_id', v_report.reference_id,
    'reason_code', v_report.reason_code, 'status', v_report.status, 'created_at', v_report.created_at
  );
end;
$$;

revoke all on function public.submit_ai_safety_report(text, uuid, text, text) from public, anon;
grant execute on function public.submit_ai_safety_report(text, uuid, text, text) to authenticated;

update public.extra_food_logs set source = 'manual' where source = 'coach';
alter table public.extra_food_logs drop constraint if exists extra_food_logs_source_check;
alter table public.extra_food_logs
  add constraint extra_food_logs_source_check
  check (source in ('emergency', 'restaurant', 'manual'));

update public.plan_versions
set source = 'admin'
where source in ('coach_revision', 'recalibration');
alter table public.plan_versions drop constraint if exists plan_versions_source_check;
alter table public.plan_versions
  add constraint plan_versions_source_check
  check (source in ('openai', 'legacy_import', 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Usage + entitlements: one monthly generation, gift not 7-day trial
-- ---------------------------------------------------------------------------
delete from public.usage_ledger
where feature in ('coach_message', 'body_composition_extraction');

alter table public.usage_ledger drop constraint if exists usage_ledger_feature_check;
alter table public.usage_ledger
  add constraint usage_ledger_feature_check check (feature = 'plan_generation');

update public.entitlements
set
  source = case when source in ('trial', 'promotion') then 'gift' else source end,
  status = case when status = 'trial' then 'active' else status end,
  plan_generation_limit = 1;

alter table public.entitlements drop constraint if exists entitlements_source_check;
alter table public.entitlements
  add constraint entitlements_source_check
  check (source in ('gift', 'subscription', 'admin'));

alter table public.entitlements drop constraint if exists entitlements_status_check;
alter table public.entitlements
  add constraint entitlements_status_check
  check (status in ('active', 'expired', 'revoked'));

alter table public.entitlements
  drop constraint if exists entitlements_non_overlapping_active_periods;
alter table public.entitlements
  add constraint entitlements_non_overlapping_active_periods
  exclude using gist (
    user_id with =,
    tstzrange(period_start, period_end, '[)') with &&
  )
  where (status = 'active');

drop index if exists public.entitlements_one_trial_per_user;
create unique index if not exists entitlements_one_gift_per_user
on public.entitlements(user_id)
where source = 'gift';

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
    or p_feature <> 'plan_generation'
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
    and status = 'active'
    and statement_timestamp() >= period_start
    and statement_timestamp() < period_end
  order by period_end desc
  limit 1
  for update;

  if v_entitlement.id is null then
    raise exception 'entitlement_required' using errcode = 'P0001';
  end if;

  v_limit := v_entitlement.plan_generation_limit;

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

-- ---------------------------------------------------------------------------
-- 3. One membership price catalog; Iran is a served market
-- ---------------------------------------------------------------------------
alter table public.product_prices drop constraint if exists product_prices_ir_ai_disabled;

update public.subscriptions set product_price_id = null
where product_price_id is not null;

delete from public.product_prices;

alter table public.product_prices
  drop column if exists included_coach_messages,
  drop column if exists included_body_composition_extractions;

alter table public.product_prices drop constraint if exists product_prices_billing_interval_check;
alter table public.product_prices
  add constraint product_prices_billing_interval_check check (billing_interval = 'month');

insert into public.product_prices(
  id,
  product_code,
  market,
  currency,
  billing_interval,
  amount_minor,
  included_plan_generations,
  active,
  metadata
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'membership',
    'global',
    'USD',
    'month',
    1499,
    1,
    true,
    '{"pricing_stage":"preview","tax_included":false}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'membership',
    'ir',
    'IRR',
    'month',
    4900000,
    1,
    true,
    '{"display_amount_toman":490000,"pricing_stage":"preview","tax_included":false}'::jsonb
  );

-- ---------------------------------------------------------------------------
-- 4. Sticky product_region (D12)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists product_region text,
  add column if not exists product_region_source text,
  add column if not exists product_region_locked_at timestamptz;

update public.profiles
set
  product_region = case when pricing_market = 'ir' then 'ir' else 'intl' end,
  product_region_source = coalesce(product_region_source, 'ip_at_signup'),
  product_region_locked_at = coalesce(product_region_locked_at, created_at)
where product_region is null;

alter table public.profiles
  alter column product_region set default 'intl',
  alter column product_region_source set default 'ip_at_signup';

alter table public.profiles
  alter column product_region set not null,
  alter column product_region_source set not null,
  alter column product_region_locked_at set not null;

alter table public.profiles drop constraint if exists profiles_product_region_check;
alter table public.profiles
  add constraint profiles_product_region_check check (product_region in ('ir', 'intl'));

alter table public.profiles drop constraint if exists profiles_product_region_source_check;
alter table public.profiles
  add constraint profiles_product_region_source_check
  check (product_region_source in ('ip_at_signup', 'admin'));

create or replace function private.protect_product_region()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.product_region is null then
      new.product_region := case when new.pricing_market = 'ir' then 'ir' else 'intl' end;
    end if;
    if new.product_region_source is null then
      new.product_region_source := 'ip_at_signup';
    end if;
    if new.product_region_locked_at is null then
      new.product_region_locked_at := statement_timestamp();
    end if;
  elsif old.product_region_locked_at is not null
    and new.product_region is distinct from old.product_region
    and coalesce(new.product_region_source, '') is distinct from 'admin'
  then
    new.product_region := old.product_region;
    new.product_region_source := old.product_region_source;
    new.product_region_locked_at := old.product_region_locked_at;
  elsif old.product_region_locked_at is not null
    and new.product_region is distinct from old.product_region
    and new.product_region_source = 'admin'
  then
    new.product_region_locked_at := statement_timestamp();
  end if;

  new.pricing_market := case when new.product_region = 'ir' then 'ir' else 'global' end;
  return new;
end;
$$;

revoke all on function private.protect_product_region() from public, anon, authenticated;

drop trigger if exists profiles_protect_product_region on public.profiles;
create trigger profiles_protect_product_region
before insert or update on public.profiles
for each row execute function private.protect_product_region();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_locale text;
  v_country text;
  v_region text;
  v_source text := 'ip_at_signup';
begin
  v_country := upper(nullif(new.raw_user_meta_data ->> 'country_code', ''));
  if new.raw_user_meta_data ->> 'product_region' in ('ir', 'intl') then
    v_region := new.raw_user_meta_data ->> 'product_region';
  elsif v_country = 'IR' then
    v_region := 'ir';
  else
    v_region := 'intl';
  end if;
  if new.raw_user_meta_data ->> 'product_region_source' = 'admin' then
    v_source := 'admin';
  end if;

  v_locale := case
    when new.raw_user_meta_data ->> 'locale' in ('en-US', 'fa-IR') then new.raw_user_meta_data ->> 'locale'
    when v_region = 'ir' then 'fa-IR'
    else 'en-US'
  end;

  insert into public.profiles(
    user_id,
    display_name,
    locale,
    timezone,
    country_code,
    product_region,
    product_region_source,
    product_region_locked_at,
    pricing_market
  ) values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120),
    v_locale,
    case when v_locale = 'fa-IR' then 'Asia/Tehran' else 'UTC' end,
    case when v_country ~ '^[A-Z]{2}$' then v_country else null end,
    v_region,
    v_source,
    statement_timestamp(),
    case when v_region = 'ir' then 'ir' else 'global' end
  );

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

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

  -- D1 gift reservation is a later campaign RPC. Residence country is not an AI gate
  -- and must not mint a 7-day trial or skip Iranian accounts.

  v_response := jsonb_build_object(
    'status', v_onboarding_status,
    'automation_block_reason', v_block_reason,
    'goal_id', v_goal_id,
    'country_code', v_country,
    'ai_country_verified', coalesce(v_ai_country_verified, false),
    'product_region', (select product_region from public.profiles where user_id = p_user_id),
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

alter table public.entitlements
  drop column if exists coach_message_limit,
  drop column if exists body_composition_extraction_limit;

-- ---------------------------------------------------------------------------
-- 5. D1 campaign + monthly cycle tables (schema/RLS only; no Stripe/OpenAI)
-- ---------------------------------------------------------------------------
create table if not exists public.first_plan_campaigns (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  total_budget_usd numeric(12,2) not null check (total_budget_usd >= 0),
  reservation_cost_usd numeric(12,2) not null check (reservation_cost_usd > 0),
  remaining_budget_usd numeric(12,2) not null check (remaining_budget_usd >= 0),
  min_remaining_usd numeric(12,2) not null default 0 check (min_remaining_usd >= 0),
  allowed_markets text[] not null default array['ir', 'intl']::text[]
    check (
      allowed_markets <@ array['ir', 'intl']::text[]
      and cardinality(allowed_markets) >= 1
    ),
  starts_at timestamptz,
  ends_at timestamptz,
  exhausted_behavior text not null default 'offer_subscription'
    check (exhausted_behavior in ('offer_subscription', 'preview_only')),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint first_plan_campaigns_budget_consistent
    check (remaining_budget_usd <= total_budget_usd),
  constraint first_plan_campaigns_window
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create trigger first_plan_campaigns_set_updated_at
before update on public.first_plan_campaigns
for each row execute function public.set_updated_at();

insert into public.first_plan_campaigns(
  id, enabled, total_budget_usd, reservation_cost_usd, remaining_budget_usd, allowed_markets
)
values (
  '20000000-0000-4000-8000-000000000001',
  false,
  0,
  2.50,
  0,
  array['ir', 'intl']::text[]
)
on conflict (id) do nothing;

create table if not exists public.gift_reservations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.first_plan_campaigns(id) on delete restrict,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  entitlement_id uuid references public.entitlements(id) on delete set null,
  status text not null check (status in ('reserved', 'consumed', 'released')),
  reserved_cost_usd numeric(12,2) not null check (reserved_cost_usd > 0),
  actual_cost_usd numeric(12,2) check (actual_cost_usd is null or actual_cost_usd >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint gift_reservations_one_person unique (user_id)
);

create index if not exists gift_reservations_campaign_status_idx
on public.gift_reservations(campaign_id, status);

create trigger gift_reservations_set_updated_at
before update on public.gift_reservations
for each row execute function public.set_updated_at();

create table if not exists public.monthly_plan_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  cycle_index integer not null check (cycle_index >= 1),
  entitlement_id uuid references public.entitlements(id) on delete restrict,
  generation_job_id uuid references public.ai_generation_jobs(id) on delete set null,
  imported_plan_version_id uuid,
  status text not null default 'draft' check (status in (
    'draft',
    'awaiting_entitlement',
    'reserved',
    'provider_started',
    'validating',
    'importing',
    'ready',
    'failed_provider',
    'failed_validation',
    'failed_import'
  )),
  ready_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint monthly_plan_periods_user_cycle unique (user_id, cycle_index),
  constraint monthly_plan_periods_id_user unique (id, user_id),
  constraint monthly_plan_periods_ready_window check (
    (status = 'ready' and ready_at is not null and starts_at = ready_at and ends_at is not null)
    or (status <> 'ready' and ready_at is null)
  )
);

create index if not exists monthly_plan_periods_user_status_idx
on public.monthly_plan_periods(user_id, status, cycle_index desc);

create trigger monthly_plan_periods_set_updated_at
before update on public.monthly_plan_periods
for each row execute function public.set_updated_at();

create table if not exists public.monthly_plan_snapshots (
  period_id uuid primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
  created_at timestamptz not null default statement_timestamp(),
  constraint monthly_plan_snapshots_period_owned
    foreign key (period_id, user_id) references public.monthly_plan_periods(id, user_id) on delete cascade
);

create index if not exists monthly_plan_snapshots_user_idx
on public.monthly_plan_snapshots(user_id);

create table if not exists public.next_cycle_inputs (
  period_id uuid primary key,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  note text check (note is null or char_length(note) <= 500),
  structured jsonb not null default '{}'::jsonb
    check (jsonb_typeof(structured) = 'object' and octet_length(structured::text) <= 8192),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint next_cycle_inputs_period_owned
    foreign key (period_id, user_id) references public.monthly_plan_periods(id, user_id) on delete cascade
);

create trigger next_cycle_inputs_set_updated_at
before update on public.next_cycle_inputs
for each row execute function public.set_updated_at();

alter table public.first_plan_campaigns enable row level security;
alter table public.gift_reservations enable row level security;
alter table public.monthly_plan_periods enable row level security;
alter table public.monthly_plan_snapshots enable row level security;
alter table public.next_cycle_inputs enable row level security;

revoke all on table
  public.first_plan_campaigns,
  public.gift_reservations,
  public.monthly_plan_periods,
  public.monthly_plan_snapshots,
  public.next_cycle_inputs
from anon, authenticated;

grant select on public.gift_reservations to authenticated;
grant select on public.monthly_plan_periods to authenticated;
grant select on public.monthly_plan_snapshots to authenticated;
grant select, insert, update on public.next_cycle_inputs to authenticated;

create policy gift_reservations_select_own
on public.gift_reservations for select to authenticated
using ((select auth.uid()) = user_id);

create policy monthly_plan_periods_select_own
on public.monthly_plan_periods for select to authenticated
using ((select auth.uid()) = user_id);

create policy monthly_plan_snapshots_select_own
on public.monthly_plan_snapshots for select to authenticated
using ((select auth.uid()) = user_id);

create policy next_cycle_inputs_select_own
on public.next_cycle_inputs for select to authenticated
using ((select auth.uid()) = user_id);

create policy next_cycle_inputs_insert_own
on public.next_cycle_inputs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy next_cycle_inputs_update_own
on public.next_cycle_inputs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.monthly_plan_periods
  drop constraint if exists monthly_plan_periods_imported_version;
alter table public.monthly_plan_periods
  add constraint monthly_plan_periods_imported_version
  foreign key (imported_plan_version_id, user_id)
  references public.plan_versions(id, user_id);

commit;
