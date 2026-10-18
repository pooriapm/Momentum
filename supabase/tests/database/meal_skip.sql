begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(24);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('16161616-1616-4161-8161-161616161616', 'meal-skip-a@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false),
  ('17171717-1717-4171-8171-171717171717', 'meal-skip-b@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false);

update public.profiles
set timezone = 'UTC'
where user_id in (
  '16161616-1616-4161-8161-161616161616',
  '17171717-1717-4171-8171-171717171717'
);

set constraints all deferred;
insert into public.plans(
  id, user_id, name, status, valid_from, valid_to, locale, active_version_id
) values (
  '18181818-1818-4181-8181-181818181818',
  '16161616-1616-4161-8161-161616161616',
  'Skip meal plan',
  'active',
  (statement_timestamp() at time zone 'UTC')::date,
  (statement_timestamp() at time zone 'UTC')::date + 29,
  'en-US',
  '19191919-1919-4191-8191-191919191919'
);
insert into public.plan_versions(
  id, plan_id, user_id, version, schema_version, source, content, content_sha256
) values (
  '19191919-1919-4191-8191-191919191919',
  '18181818-1818-4181-8181-181818181818',
  '16161616-1616-4161-8161-161616161616',
  1,
  '1.0.0',
  'admin',
  jsonb_build_object(
    'plan_name', 'Skip meal plan',
    'default_targets', '{}'::jsonb,
    'content_locale', 'en-US',
    'days', jsonb_build_array(jsonb_build_object(
      'day_index', 0,
      'meals', jsonb_build_array(
        jsonb_build_object(
          'slot_key', 'lunch',
          'title', 'Lunch',
          'options', jsonb_build_array(jsonb_build_object(
            'option_key', 'chicken-rice',
            'title', 'Chicken rice',
            'nutrition', jsonb_build_object('calories', 620, 'protein_g', 42)
          ))
        ),
        jsonb_build_object(
          'slot_key', 'dinner',
          'title', 'Dinner',
          'options', jsonb_build_array(
            jsonb_build_object(
              'option_key', 'salmon-bowl',
              'title', 'Salmon bowl',
              'nutrition', jsonb_build_object('calories', 680, 'protein_g', 40)
            ),
            jsonb_build_object(
              'option_key', 'lentil-stew',
              'title', 'Lentil stew',
              'nutrition', jsonb_build_object('calories', 540, 'protein_g', 28)
            )
          )
        )
      )
    )) || (
      select jsonb_agg(jsonb_build_object('day_index', day_index) order by day_index)
      from generate_series(1,29) day_index
    )
  ),
  repeat('b', 64)
);

create temporary table meal_skip_today on commit drop as
select (statement_timestamp() at time zone 'UTC')::date as local_date;

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.skip_meal_option(uuid,date,text,text,text,text)',
    'execute'
  ),
  'authenticated clients cannot call skip_meal_option directly'
);

-- planned -> skipped (no status row yet)
select extensions.is(
  (public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'lunch','chicken-rice','skip-meal-key-1',repeat('a',64)
  ) ->> 'status'),
  'skipped',
  'the owner can skip a current-day meal that has no status row yet'
);
select extensions.ok(
  (select status = 'skipped' and completed_at is null and option_title_snapshot = 'Chicken rice'
    from public.daily_meal_status
    where user_id = '16161616-1616-4161-8161-161616161616' and slot_key = 'lunch'),
  'a skip is persisted with no completed_at and the option snapshot'
);
select extensions.is(
  (public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'lunch','chicken-rice','skip-meal-key-1',repeat('a',64)
  ) ->> 'status'),
  'skipped',
  'a skip safely replays with the same idempotency key'
);
select extensions.throws_ok(
  $$select public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','chicken-rice','skip-meal-key-1',repeat('b',64)
  )$$,
  'P0001',
  'idempotency_key_reused',
  'a skip idempotency key cannot be reused with different input'
);
select extensions.is(
  (public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'lunch','chicken-rice','skip-meal-key-2',repeat('c',64)
  ) ->> 'status'),
  'skipped',
  'skipping an already-skipped meal with a new key stays skipped'
);
select extensions.is(
  (select count(*)::integer from public.daily_meal_status
    where user_id = '16161616-1616-4161-8161-161616161616' and slot_key = 'lunch'),
  1,
  'repeated skips keep a single status row for the slot'
);

-- skipped -> planned (undo)
select extensions.throws_ok(
  $$select public.undo_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','other-option','undo-skip-wrong-option',repeat('d',64)
  )$$,
  'P0001',
  'completed_meal_locked',
  'undo of a skip is limited to the skipped option'
);
select extensions.is(
  (public.undo_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'lunch','chicken-rice','undo-skip-key-1',repeat('e',64)
  ) ->> 'status'),
  'planned',
  'undo returns a skipped meal to planned'
);
select extensions.ok(
  (select status = 'planned' and completed_at is null
    from public.daily_meal_status
    where user_id = '16161616-1616-4161-8161-161616161616' and slot_key = 'lunch'),
  'the undone skip is persisted as planned'
);

-- skipped -> completed (eat after skipping)
select extensions.lives_ok(
  $$select public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','chicken-rice','skip-meal-key-3',repeat('f',64)
  )$$,
  'the owner can skip the meal again after undo'
);
select extensions.is(
  (public.complete_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'lunch','chicken-rice','complete-after-skip-1',repeat('0',64)
  ) ->> 'status'),
  'completed',
  'a skipped meal can be completed directly'
);
select extensions.ok(
  (select status = 'completed' and completed_at is not null
    from public.daily_meal_status
    where user_id = '16161616-1616-4161-8161-161616161616' and slot_key = 'lunch'),
  'completing a skipped meal stamps completed_at'
);

-- completed -> skipped is rejected until undone
select extensions.throws_ok(
  $$select public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','chicken-rice','skip-completed-key',repeat('1',64)
  )$$,
  'P0001',
  'completed_meal_locked',
  'a completed meal cannot be skipped'
);
select extensions.is(
  (select status from public.daily_meal_status
    where user_id = '16161616-1616-4161-8161-161616161616' and slot_key = 'lunch'),
  'completed',
  'a rejected skip leaves the completed meal untouched'
);
select extensions.is(
  (public.undo_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'lunch','chicken-rice','undo-complete-key-1',repeat('2',64)
  ) ->> 'status'),
  'planned',
  'undo of a completed meal still returns it to planned'
);
select extensions.is(
  (public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'lunch','chicken-rice','skip-after-undo-key',repeat('3',64)
  ) ->> 'status'),
  'skipped',
  'a meal can be skipped after its completion is undone'
);

-- select-meal on a skipped slot swaps the option and keeps it skipped
select extensions.lives_ok(
  $$select public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (statement_timestamp() at time zone 'UTC')::date,
    'dinner','salmon-bowl','skip-dinner-key-1',repeat('4',64)
  )$$,
  'the owner can skip a second slot'
);
select extensions.is(
  (public.select_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (select local_date from meal_skip_today),
    'dinner','lentil-stew','select-skipped-dinner',repeat('5',64)
  ) ->> 'status'),
  'skipped',
  'selecting another option on a skipped slot keeps it skipped'
);
select extensions.is(
  (select option_key from public.daily_meal_status
    where user_id = '16161616-1616-4161-8161-161616161616' and slot_key = 'dinner'),
  'lentil-stew',
  'the option swap on a skipped slot is persisted'
);

-- Skipped meals never count as eaten.
select extensions.is(
  (select count(*)::integer from public.daily_meal_status
    where user_id = '16161616-1616-4161-8161-161616161616' and status = 'completed'),
  0,
  'skipped meals are not counted as completed'
);

-- Lock window and plan checks
select extensions.throws_ok(
  $$select public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    ((statement_timestamp() at time zone 'UTC')::date - 1),
    'lunch','chicken-rice','skip-yesterday-key',repeat('6',64)
  )$$,
  'P0001',
  'meal_date_not_current',
  'meals outside the current local day cannot be skipped'
);
select extensions.throws_ok(
  $$select public.skip_meal_option(
    '16161616-1616-4161-8161-161616161616',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','not-in-plan','skip-unknown-option',repeat('7',64)
  )$$,
  'P0002',
  'meal_option_not_found',
  'only options in the active plan can be skipped'
);
select extensions.throws_ok(
  $$select public.skip_meal_option(
    '17171717-1717-4171-8171-171717171717',
    (statement_timestamp() at time zone 'UTC')::date,
    'lunch','chicken-rice','skip-other-user-key',repeat('8',64)
  )$$,
  'P0002',
  'active_plan_not_found',
  'another user cannot skip against the owner plan'
);

select * from extensions.finish();
rollback;
