begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous)
values
  ('22222222-2222-4222-8222-222222222222','workout-a@example.com',statement_timestamp(),'{}','{"locale":"en-US","country_code":"US"}',statement_timestamp(),statement_timestamp(),false,false),
  ('33333333-3333-4333-8333-333333333333','workout-b@example.com',statement_timestamp(),'{}','{"locale":"en-US","country_code":"US"}',statement_timestamp(),statement_timestamp(),false,false);

update public.profiles set timezone = 'UTC' where user_id in (
  '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'
);

set constraints all deferred;
insert into public.plans(id,user_id,name,status,valid_from,valid_to,locale,active_version_id)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',
  'Workout test','active',(statement_timestamp() at time zone 'UTC')::date,
  (statement_timestamp() at time zone 'UTC')::date,'en-US','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);
insert into public.plan_versions(id,plan_id,user_id,version,schema_version,source,content,content_sha256)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',1,'1.0.0','admin',
  jsonb_build_object(
    'plan_name','Workout test','default_targets','{}'::jsonb,
    'days',jsonb_build_array(jsonb_build_object('day_index',0,'workout',jsonb_build_object(
      'title','Strength','exercises',jsonb_build_array(
        jsonb_build_object('exercise_key','squat','name','Squat','sets',2,'reps','8','rest_seconds',90)
      )
    )))
  ), repeat('a',64)
);

set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);

select extensions.lives_ok(
  $$select public.start_workout_session((statement_timestamp() at time zone 'UTC')::date, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-0')$$,
  'the owner can start the current planned workout'
);
select extensions.is((select count(*)::integer from public.workout_sessions),1,'one session is created');
select extensions.is((select count(*)::integer from public.workout_exercise_logs),1,'planned exercises are snapshotted');
select extensions.is((select count(*)::integer from public.workout_set_logs),2,'one log row is created per set');
select extensions.throws_ok(
  $$insert into public.workout_sessions(user_id,local_date,plan_version_id,workout_key,workout_title)
    values ('22222222-2222-4222-8222-222222222222',current_date,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bypass','Bypass')$$,
  '42501', 'permission denied for table workout_sessions', 'authenticated clients cannot bypass the mutation RPC'
);

select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'update_set','squat',1,
    '{"completed":true,"weight_kg":40,"reps":8,"rpe":7.5,"rest_seconds":90}'::jsonb
  )$$,
  'a valid completed set can be logged'
);
select extensions.is((select status from public.workout_set_logs where set_number=1),'completed','set completion is saved');

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select extensions.is((select count(*)::integer from public.workout_sessions),0,'RLS hides another user workout session');

select * from extensions.finish();
rollback;
