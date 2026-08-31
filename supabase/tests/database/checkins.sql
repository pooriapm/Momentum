begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('33333333-3333-4333-8333-333333333333', 'checkin-one@example.com', statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb, statement_timestamp(), statement_timestamp(), false, false),
  ('44444444-4444-4444-8444-444444444444', 'checkin-two@example.com', statement_timestamp(), '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb, statement_timestamp(), statement_timestamp(), false, false);

update public.profiles
set timezone = 'UTC'
where user_id in (
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);

select extensions.lives_ok(
  $$select public.save_daily_checkin(
    '33333333-3333-4333-8333-333333333333',
    current_date,
    'UTC',
    '{"adherence_percent":80,"energy_score":3,"hunger_score":3,"mood_score":4,"sleep_minutes":420,"weight_kg":75,"pain_score":5,"pain_location":"left knee","training_difficulty_score":5,"recovery_score":2,"notes":"test","red_flags":[]}'::jsonb,
    'daily-checkin-key-1',
    repeat('a', 64)
  )$$,
  'a complete daily check-in is accepted'
);

select extensions.is(
  (select pain_location from public.daily_checkins where user_id = '33333333-3333-4333-8333-333333333333' and local_date = current_date),
  'left knee',
  'pain context is persisted'
);

select extensions.is(
  (select safety_level from public.daily_checkins where user_id = '33333333-3333-4333-8333-333333333333' and local_date = current_date),
  'caution',
  'daily safety level is classified server-side'
);

select extensions.is(
  (select count(*) from private.account_audit_events where user_id = '33333333-3333-4333-8333-333333333333' and event_type = 'checkin.daily_saved'),
  1::bigint,
  'daily mutation is audited'
);

select extensions.is(
  (public.save_daily_checkin(
    '33333333-3333-4333-8333-333333333333', current_date, 'UTC',
    '{"adherence_percent":80,"energy_score":3,"hunger_score":3,"mood_score":4,"sleep_minutes":420,"weight_kg":75,"pain_score":5,"pain_location":"left knee","training_difficulty_score":5,"recovery_score":2,"notes":"test","red_flags":[]}'::jsonb,
    'daily-checkin-key-1', repeat('a', 64)
  ) -> 'checkin' ->> 'id'),
  (select id::text from public.daily_checkins where user_id = '33333333-3333-4333-8333-333333333333' and local_date = current_date),
  'an idempotent replay returns the original row'
);

select extensions.is(
  (select count(*) from private.account_audit_events where user_id = '33333333-3333-4333-8333-333333333333' and event_type = 'checkin.daily_saved'),
  1::bigint,
  'an idempotent replay does not duplicate the audit event'
);

select extensions.throws_ok(
  $$select public.save_daily_checkin(
    '33333333-3333-4333-8333-333333333333', current_date, 'UTC',
    '{"adherence_percent":80,"energy_score":4,"hunger_score":3,"mood_score":4,"sleep_minutes":420,"weight_kg":75,"pain_score":5,"pain_location":"left knee","training_difficulty_score":5,"recovery_score":2,"notes":"test","red_flags":[]}'::jsonb,
    'daily-checkin-key-1', repeat('b', 64)
  )$$,
  'P0001',
  'idempotency_key_reused',
  'an idempotency key cannot be reused with different input'
);

select extensions.lives_ok(
  $$select public.save_weekly_checkin(
    '33333333-3333-4333-8333-333333333333',
    date_trunc('week', current_date)::date,
    'UTC',
    '{"overall_score":3,"recovery_trend":"worse","training_trend":"harder","pain_trend":"worse","circumstances_changed":true,"condition_change":"injury_or_worsening_pain","change_notes":"knee pain increased","notes":null,"red_flags":[]}'::jsonb,
    'weekly-checkin-key-1',
    repeat('c', 64)
  )$$,
  'a complete weekly check-in is accepted'
);

select extensions.is(
  (select (trend_summary ->> 'current_daily_count')::integer from public.weekly_checkins where user_id = '33333333-3333-4333-8333-333333333333'),
  1,
  'weekly trend uses real daily rows from the current week'
);

select extensions.is(
  (select safety_level from public.weekly_checkins where user_id = '33333333-3333-4333-8333-333333333333'),
  'caution',
  'weekly changes trigger deterministic caution'
);

select extensions.ok(
  not has_function_privilege('authenticated', 'public.save_daily_checkin(uuid,date,text,jsonb,text,text)', 'execute'),
  'authenticated clients cannot bypass the daily service mutation'
);

select extensions.ok(
  not has_function_privilege('authenticated', 'public.save_weekly_checkin(uuid,date,text,jsonb,text,text)', 'execute'),
  'authenticated clients cannot bypass the weekly service mutation'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select extensions.is((select count(*) from public.weekly_checkins), 1::bigint, 'the owner can read their weekly check-in');
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select extensions.is((select count(*) from public.weekly_checkins), 0::bigint, 'another user cannot read the weekly check-in');
set local role postgres;

select * from extensions.finish();
rollback;
