-- Match the optional food fields in the onboarding UI. Empty preferences remain
-- empty arrays; omitted budget keeps the existing medium fallback.
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
    or coalesce(v_payload ->> 'foodBudget', '') not in ('', 'budget', 'standard', 'flexible')
    or char_length(trim(coalesce(v_payload ->> 'workSchedule', ''))) not between 1 and 1000
    or char_length(trim(coalesce(v_payload ->> 'favoriteFoods', ''))) > 4000
    or char_length(trim(coalesce(v_payload ->> 'requestedMealPattern', ''))) not between 1 and 500
    or char_length(trim(coalesce(v_payload ->> 'cookingConstraints', ''))) > 4000
    or char_length(trim(coalesce(v_payload ->> 'groceryPreferences', ''))) > 4000
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

