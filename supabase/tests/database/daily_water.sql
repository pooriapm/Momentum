begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', 'water-a@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false),
  ('5b5b5b5b-5b5b-45b5-85b5-5b5b5b5b5b5b', 'water-b@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false);

update public.profiles
set timezone = 'UTC'
where user_id in (
  '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a',
  '5b5b5b5b-5b5b-45b5-85b5-5b5b5b5b5b5b'
);

create temporary table water_today on commit drop as
select private.current_profile_local_date('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a') as local_date;

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.save_daily_water(uuid,date,text,integer,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.save_daily_water(uuid,date,text,integer,text,text)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.save_daily_water(uuid,date,text,integer,text,text)',
    'execute'
  ),
  'save_daily_water is service-only'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.daily_water_logs', 'INSERT')
  and not has_table_privilege('authenticated', 'public.daily_water_logs', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.daily_water_logs', 'DELETE')
  and not has_table_privilege('service_role', 'public.daily_water_logs', 'INSERT')
  and not has_table_privilege('service_role', 'public.daily_water_logs', 'DELETE')
  and has_table_privilege('authenticated', 'public.daily_water_logs', 'SELECT'),
  'water logs are owner-readable and only written through the RPC'
);

-- Current date only.
select extensions.throws_ok(
  format(
    $$select public.save_daily_water('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', %L::date, 'UTC', 500, 'water-key-yesterday', repeat('a', 64))$$,
    (select local_date - 1 from water_today)
  ),
  'P0001',
  'checkin_date_not_current',
  'water for a past date is rejected'
);

select extensions.throws_ok(
  format(
    $$select public.save_daily_water('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', %L::date, 'UTC', 500, 'water-key-tomorrow', repeat('a', 64))$$,
    (select local_date + 1 from water_today)
  ),
  'P0001',
  'checkin_date_not_current',
  'water for a future date is rejected'
);

select extensions.throws_ok(
  format(
    $$select public.save_daily_water('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', %L::date, 'Asia/Tehran', 500, 'water-key-timezone', repeat('a', 64))$$,
    (select local_date from water_today)
  ),
  'P0001',
  'profile_timezone_mismatch',
  'a timezone other than the profile timezone is rejected'
);

select extensions.throws_ok(
  format(
    $$select public.save_daily_water('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', %L::date, 'UTC', 20001, 'water-key-too-much', repeat('a', 64))$$,
    (select local_date from water_today)
  ),
  '22023',
  'invalid_daily_water_arguments',
  'water above 20000 ml is rejected'
);

-- Save and replay.
select extensions.is(
  public.save_daily_water(
    '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a',
    (select local_date from water_today),
    'UTC', 750, 'water-key-1', repeat('a', 64)
  ),
  jsonb_build_object(
    'water', jsonb_build_object('local_date', (select local_date from water_today), 'water_ml', 750)
  ),
  'water for today is saved and returned'
);

select extensions.is(
  public.save_daily_water(
    '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a',
    (select local_date from water_today),
    'UTC', 750, 'water-key-1', repeat('a', 64)
  ) -> 'water' ->> 'water_ml',
  '750',
  'an idempotent replay returns the stored response'
);

select extensions.throws_ok(
  format(
    $$select public.save_daily_water('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', %L::date, 'UTC', 1000, 'water-key-1', repeat('b', 64))$$,
    (select local_date from water_today)
  ),
  'P0001',
  'idempotency_key_reused',
  'reusing a key for different input is rejected'
);

select extensions.is(
  (public.save_daily_water(
    '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a',
    (select local_date from water_today),
    'UTC', 1250, 'water-key-2', repeat('c', 64)
  ) -> 'water' ->> 'water_ml')::integer,
  1250,
  'a new key sets the day total (not an increment)'
);

select extensions.is(
  (select count(*)::integer from public.daily_water_logs
    where user_id = '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a'),
  1,
  'one water row per day'
);

-- Water alone is not a daily report.
select extensions.is(
  (select count(*)::integer from public.daily_checkins
    where user_id = '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a'),
  0,
  'saving water does not create a daily check-in'
);

-- save-daily keeps water, and water keeps the report.
select extensions.lives_ok(
  format(
    $$select public.save_daily_checkin(
      '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', %L::date, 'UTC',
      '{"energy_score":3,"hunger_score":3,"mood_score":4,"sleep_minutes":420,"pain_score":0,"recovery_score":4,"red_flags":[]}'::jsonb,
      'water-daily-key-1', repeat('d', 64)
    )$$,
    (select local_date from water_today)
  ),
  'the daily report saves after water was logged'
);

select extensions.is(
  (select water_ml from public.daily_water_logs
    where user_id = '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a'
      and local_date = (select local_date from water_today)),
  1250,
  'save-daily keeps the water total'
);

select extensions.is(
  (
    select mood_score::integer
    from public.daily_checkins
    where user_id = '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a'
      and local_date = (select local_date from water_today)
      and (public.save_daily_water(
        '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a',
        (select local_date from water_today),
        'UTC', 2000, 'water-key-3', repeat('e', 64)
      ) -> 'water' ->> 'water_ml') = '2000'
  ),
  4,
  'saving water keeps the daily report'
);

-- Account purge removes water.
select public.purge_account_owned_rows('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a');
select extensions.is(
  (select count(*)::integer from public.daily_water_logs
    where user_id = '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a'),
  0,
  'account purge removes water logs'
);

select * from extensions.finish();
rollback;
