begin;
set local role postgres;
set local search_path = extensions, public;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users(
  id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,
  created_at,updated_at,is_sso_user,is_anonymous
) values (
  '41414141-4141-4141-8141-414141414141','progress@example.com',statement_timestamp(),
  '{}'::jsonb,'{"locale":"en-US","country_code":"US"}'::jsonb,
  statement_timestamp(),statement_timestamp(),false,false
);

set constraints all deferred;
insert into public.plans(id,user_id,name,status,valid_from,valid_to,locale,active_version_id)
values (
  '42424242-4242-4242-8242-424242424242','41414141-4141-4141-8141-414141414141',
  'Progress fixture','active','2026-08-17','2026-09-15','en-US',
  '43434343-4343-4343-8343-434343434343'
);
insert into public.plan_versions(
  id,plan_id,user_id,version,schema_version,source,content,content_sha256
) values (
  '43434343-4343-4343-8343-434343434343','42424242-4242-4242-8242-424242424242',
  '41414141-4141-4141-8141-414141414141',1,'1.0.0','admin',
  jsonb_build_object(
    'plan_name','Progress fixture','default_targets','{}'::jsonb,
    'days',(
      select jsonb_agg(jsonb_build_object(
        'day_index',day_index,
        'meals',jsonb_build_array(jsonb_build_object('slot_key','lunch')),
        'workout',jsonb_build_object('exercises',jsonb_build_array(jsonb_build_object('exercise_key','walk')))
      ) order by day_index)
      from generate_series(0,29) day_index
    )
  ),repeat('a',64)
);

insert into public.daily_meal_status(
  user_id,local_date,plan_version_id,slot_key,option_key,status,completed_at
) values
  ('41414141-4141-4141-8141-414141414141','2026-08-20','43434343-4343-4343-8343-434343434343','lunch','meal','completed',statement_timestamp()),
  ('41414141-4141-4141-8141-414141414141','2026-08-21','43434343-4343-4343-8343-434343434343','lunch','meal','completed',statement_timestamp()),
  ('41414141-4141-4141-8141-414141414141','2026-08-22','43434343-4343-4343-8343-434343434343','lunch','meal','completed',statement_timestamp()),
  ('41414141-4141-4141-8141-414141414141','2026-08-24','43434343-4343-4343-8343-434343434343','lunch','meal','completed',statement_timestamp());

insert into public.workout_sessions(
  user_id,local_date,plan_version_id,workout_key,workout_title,status,ended_at
) values
  ('41414141-4141-4141-8141-414141414141','2026-08-20','43434343-4343-4343-8343-434343434343','workout-20','Walk','completed',statement_timestamp()),
  ('41414141-4141-4141-8141-414141414141','2026-08-21','43434343-4343-4343-8343-434343434343','workout-21','Walk','completed',statement_timestamp());

insert into public.daily_checkins(user_id,local_date,timezone,energy_score)
values
  ('41414141-4141-4141-8141-414141414141','2026-08-20','UTC',4),
  ('41414141-4141-4141-8141-414141414141','2026-08-21','UTC',3),
  ('41414141-4141-4141-8141-414141414141','2026-08-24','UTC',5);

select extensions.ok(
  not has_function_privilege('authenticated','public.get_progress_series(uuid,date)','execute'),
  'the browser cannot request another account progress aggregate directly'
);
select extensions.is(
  jsonb_array_length(public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')),
  2,
  'only weeks with controlled facts are returned'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->0->>'meals_planned')::integer,
  7,
  'the completed week counts seven planned meals from immutable plan content'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->0->>'meals_completed')::integer,
  3,
  'the completed week counts actual completed meal rows'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->0->>'workouts_planned')::integer,
  7,
  'the completed week counts seven planned workouts'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->0->>'workouts_completed')::integer,
  2,
  'the completed week counts actual completed workout sessions'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->0->>'adherence')::integer,
  36,
  'adherence is the rounded completed-to-planned opportunity ratio'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->0->>'energy')::numeric,
  7.0::numeric,
  'energy is the controlled check-in average on the ten-point display scale'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->0->>'partial')::boolean,
  false,
  'a fully covered prior week is not marked partial'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->1->>'adherence')::integer,
  50,
  'the current partial week is calculated from available facts rather than treated as zero'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-08-24')->1->>'partial')::boolean,
  true,
  'the current week is explicitly marked partial'
);
select extensions.is(
  jsonb_array_length(public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-09-15')),
  5,
  'a complete 30-day plan exposes its final two days as a fifth progress segment'
);
select extensions.is(
  (public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-09-15')->4->>'meals_planned')::integer,
  2,
  'the final progress segment counts only the two stored month days without repetition'
);
select extensions.is(
  public.get_progress_series('41414141-4141-4141-8141-414141414141','2026-09-15')->4->>'week_end',
  '2026-09-15',
  'the final segment ends at the inclusive 30-day plan boundary'
);
select extensions.throws_ok(
  $$insert into public.plan_versions(
    id,plan_id,user_id,version,schema_version,source,content,content_sha256
  ) values (
    '45454545-4545-4545-8545-454545454545',
    '42424242-4242-4242-8242-424242424242',
    '41414141-4141-4141-8141-414141414141',
    2,'1.0.0','admin',
    '{"plan_name":"Short","default_targets":{},"days":[{"day_index":0}]}'::jsonb,
    repeat('b',64)
  )$$,
  '23514',null,
  'the database rejects a short plan version instead of expanding it by repetition'
);
select extensions.throws_ok(
  $$update public.plan_versions set source='legacy_import' where id='43434343-4343-4343-8343-434343434343'$$,
  '55000','plan_version_immutable','stored plan versions cannot be rewritten'
);

select * from extensions.finish();
rollback;
