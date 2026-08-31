begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('12121212-1212-4121-8121-121212121212', 'meal-undo-a@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false),
  ('13131313-1313-4131-8131-131313131313', 'meal-undo-b@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false);

update public.profiles
set timezone = 'UTC'
where user_id in (
  '12121212-1212-4121-8121-121212121212',
  '13131313-1313-4131-8131-131313131313'
);

set constraints all deferred;
insert into public.plans(
  id, user_id, name, status, valid_from, valid_to, locale, active_version_id
) values (
  '14141414-1414-4141-8141-141414141414',
  '12121212-1212-4121-8121-121212121212',
  'Undo meal plan',
  'active',
  (statement_timestamp() at time zone 'UTC')::date,
  (statement_timestamp() at time zone 'UTC')::date + 29,
  'en-US',
  '15151515-1515-4151-8151-151515151515'
);
insert into public.plan_versions(
  id, plan_id, user_id, version, schema_version, source, content, content_sha256
) values (
  '15151515-1515-4151-8151-151515151515',
  '14141414-1414-4141-8141-141414141414',
  '12121212-1212-4121-8121-121212121212',
  1,
  '1.0.0',
  'admin',
  jsonb_build_object(
    'plan_name', 'Undo meal plan',
    'default_targets', '{}'::jsonb,
    'content_locale', 'en-US',
    'days', jsonb_build_array(jsonb_build_object(
      'day_index', 0,
      'meals', jsonb_build_array(jsonb_build_object(
        'slot_key', 'lunch',
        'title', 'Lunch',
        'options', jsonb_build_array(jsonb_build_object(
          'option_key', 'chicken-rice',
          'title', 'Chicken rice',
          'nutrition', jsonb_build_object('calories', 620, 'protein_g', 42)
        ))
      ))
    )) || (
      select jsonb_agg(jsonb_build_object('day_index', day_index) order by day_index)
      from generate_series(1,29) day_index
    )
  ),
  repeat('b', 64)
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.undo_meal_option(uuid,date,text,text,text,text)',
    'execute'
  ),
  'authenticated clients cannot call undo_meal_option directly'
);

select extensions.lives_ok(
  $$select public.select_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','chicken-rice','select-meal-key-1',repeat('a',64)
  )$$,
  'the owner can persist a current-day meal selection'
);
select extensions.is(
  (select option_key from public.daily_meal_status
    where user_id = '12121212-1212-4121-8121-121212121212' and slot_key = 'lunch'),
  'chicken-rice',
  'the selected option is persisted'
);
select extensions.is(
  (public.select_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','chicken-rice','select-meal-key-1',repeat('a',64)
  ) ->> 'option_key'),
  'chicken-rice',
  'a meal selection safely replays'
);

select extensions.lives_ok(
  $$select public.complete_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch',
    'chicken-rice',
    'complete-meal-key-1',
    repeat('c', 64)
  )$$,
  'the owner can complete the current-day meal'
);

select extensions.is(
  (select status from public.daily_meal_status
    where user_id = '12121212-1212-4121-8121-121212121212' and slot_key = 'lunch'),
  'completed',
  'completion is persisted before undo'
);

select extensions.is(
  (public.complete_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','chicken-rice','complete-meal-key-1',repeat('c',64)
  ) ->> 'status'),
  'completed',
  'meal completion safely replays'
);

select extensions.lives_ok(
  $$select public.undo_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch',
    'chicken-rice',
    'undo-meal-key-1',
    repeat('d', 64)
  )$$,
  'the owner can undo the same current-day slot'
);

select extensions.is(
  (select status from public.daily_meal_status
    where user_id = '12121212-1212-4121-8121-121212121212' and slot_key = 'lunch'),
  'planned',
  'undo returns the meal to planned without calling AI'
);

select extensions.is(
  (select completed_at from public.daily_meal_status
    where user_id = '12121212-1212-4121-8121-121212121212' and slot_key = 'lunch'),
  null,
  'undo clears completed_at'
);

select extensions.is(
  (public.undo_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch',
    'chicken-rice',
    'undo-meal-key-1',
    repeat('d', 64)
  ) ->> 'status'),
  'planned',
  'an idempotent undo replay returns the original result'
);

select extensions.throws_ok(
  $$select public.undo_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch',
    'chicken-rice',
    'undo-meal-key-1',
    repeat('e', 64)
  )$$,
  'P0001',
  'idempotency_key_reused',
  'an undo idempotency key cannot be reused with different input'
);

select extensions.throws_ok(
  $$select public.undo_meal_option(
    '13131313-1313-4131-8131-131313131313',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch',
    'chicken-rice',
    'undo-meal-other-user',
    repeat('f', 64)
  )$$,
  'P0002',
  'meal_not_completed',
  'another user cannot undo the owner meal'
);

select extensions.lives_ok(
  $$select public.complete_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch',
    'chicken-rice',
    'complete-meal-key-2',
    repeat('0', 64)
  )$$,
  'the owner can complete the meal again after undo'
);

select extensions.throws_ok(
  $$select public.undo_meal_option(
    '12121212-1212-4121-8121-121212121212',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch',
    'other-option',
    'undo-meal-wrong-option',
    repeat('1', 64)
  )$$,
  'P0001',
  'completed_meal_locked',
  'undo is limited to the completed option on that slot'
);

select extensions.throws_ok(
  $$select public.undo_meal_option(
    '12121212-1212-4121-8121-121212121212',
    ((statement_timestamp() at time zone 'UTC')::date - 1),
    'lunch',
    'chicken-rice',
    'undo-meal-yesterday',
    repeat('2', 64)
  )$$,
  'P0001',
  'meal_date_not_current',
  'meals outside the current local day stay locked'
);

select * from extensions.finish();
rollback;
