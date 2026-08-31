begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(
  id,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
) values (
  '11111111-1111-4111-8111-111111111111',
  'onboarding-test@example.com',
  statement_timestamp(),
  '{}'::jsonb,
  '{"locale":"en-US","country_code":"US"}'::jsonb,
  statement_timestamp(),
  statement_timestamp(),
  false,
  false
);

insert into public.onboarding_drafts(user_id, current_step, payload)
values (
  '11111111-1111-4111-8111-111111111111',
  'review',
  jsonb_build_object(
    'firstName', 'Test user',
    'birthDate', '1990-01-01',
    'sex', 'undisclosed',
    'heightCm', '175',
    'weightKg', '80',
    'country', 'US',
    'planSource', 'external',
    'goalType', 'fat_loss',
    'targetWeightKg', '74',
    'adultConfirmed', 'yes',
    'pregnancyOrBreastfeeding', 'no',
    'eatingDisorderHistory', 'no',
    'highRiskCondition', 'no',
    'medicalNotes', 'none',
    'medications', 'medicine one',
    'supplements', 'creatine',
    'dietStyle', 'omnivore',
    'favoriteFoods', 'rice, chicken',
    'dislikedFoods', 'okra',
    'allergies', '',
    'requestedMealPattern', 'three meals and one snack',
    'preferredOptionCount', '3',
    'cookingConstraints', '30 minutes on weekdays',
    'foodBudget', 'standard',
    'restaurantMealsPerWeek', '1',
    'restaurantPreferences', 'grilled food',
    'groceryPreferences', 'weekly supermarket shop',
    'trainingDays', '3',
    'primaryActivity', 'strength',
    'trainingWeekdays', '1,3,5',
    'trainingStartTime', '18:30',
    'trainingDuration', '75',
    'trainingAvailability', 'weekday evenings',
    'equipment', 'barbell, dumbbells',
    'workSchedule', 'Monday to Friday, 9 to 5',
    'termsAccepted', 'yes',
    'privacyAccepted', 'yes',
    'healthDataConsent', 'yes',
    'locale', 'en-US',
    'timezone', 'America/New_York'
  )
);

select extensions.lives_ok(
  $$select public.complete_onboarding(
    '11111111-1111-4111-8111-111111111111',
    'onboarding-test-key',
    'alpha-terms',
    'alpha-privacy',
    'alpha-health'
  )$$,
  'a complete adaptive onboarding payload is accepted'
);

select extensions.is(
  (select onboarding_status from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'complete',
  'profile is marked complete'
);

select extensions.is(
  (select plan_source_preference from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'external',
  'the selected external plan path is persisted on the account'
);

select extensions.is(
  (select preferred_option_count from public.dietary_preferences where user_id = '11111111-1111-4111-8111-111111111111'),
  3::smallint,
  'meal option count is persisted'
);

select extensions.is(
  (select restaurant_meals_per_week from public.dietary_preferences where user_id = '11111111-1111-4111-8111-111111111111'),
  1::smallint,
  'restaurant frequency is persisted'
);

select extensions.ok(
  (select medications @> array['medicine one'] from public.health_context where user_id = '11111111-1111-4111-8111-111111111111'),
  'medications are persisted separately'
);

select extensions.is(
  (select count(*)::integer from public.training_schedule_items where user_id = '11111111-1111-4111-8111-111111111111'),
  3,
  'the requested number of training sessions is persisted'
);

select extensions.is(
  (select array_agg(weekday order by weekday)::text from public.training_schedule_items where user_id = '11111111-1111-4111-8111-111111111111'),
  '{1,3,5}',
  'the exact selected weekdays are persisted'
);

select extensions.ok(
  (select bool_and(local_start_time = time '18:30' and duration_minutes = 75) from public.training_schedule_items where user_id = '11111111-1111-4111-8111-111111111111'),
  'training time and duration are persisted'
);

select * from extensions.finish();
rollback;
