begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(29);

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
        jsonb_build_object(
          'exercise_id','exercise:bodyweight-squat@v2','exercise_key','squat','name','Bodyweight squat',
          'sets',2,'reps','8','rest_seconds',90,
          'substitution_exercise_id','exercise:sit-to-stand@v2','substitution','Sit to stand'
        ),
        jsonb_build_object(
          'exercise_id','exercise:wall-pushup@v2','exercise_key','push','name','Wall push-up',
          'sets',2,'reps','8','rest_seconds',60,
          'substitution_exercise_id','exercise:knee-pushup@v2','substitution','Knee push-up'
        )
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
select extensions.lives_ok(
  $$select public.start_workout_session((statement_timestamp() at time zone 'UTC')::date, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-0')$$,
  'starting the same workout again returns the existing session'
);
select extensions.is((select count(*)::integer from public.workout_sessions),1,'one session is created');
select extensions.is((select count(*)::integer from public.workout_exercise_logs),2,'planned exercises are snapshotted');
select extensions.is((select count(*)::integer from public.workout_set_logs),4,'one log row is created per set');
select extensions.is(
  (select exercise_id from public.workout_exercise_logs where exercise_key = 'squat'),
  'exercise:bodyweight-squat@v2',
  'the canonical exercise ID is snapshotted'
);
select extensions.throws_ok(
  $$insert into public.workout_sessions(user_id,local_date,plan_version_id,workout_key,workout_title)
    values ('22222222-2222-4222-8222-222222222222',current_date,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','bypass','Bypass')$$,
  '42501', 'permission denied for table workout_sessions', 'authenticated clients cannot bypass the mutation RPC'
);

select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'update_set','squat',1,
    '{"completed":true,"weight_kg":40,"reps":8,"rpe":7.5,"rest_seconds":90}'::jsonb,
    'workout-update-set-0001'
  )$$,
  'a valid completed set can be logged'
);
select extensions.is((
  select set_log.status
  from public.workout_set_logs set_log
  join public.workout_exercise_logs exercise on exercise.id = set_log.exercise_log_id
  where exercise.exercise_key = 'squat' and set_log.set_number = 1
),'completed','set completion is saved');

select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'update_set','squat',1,
    '{"completed":true,"weight_kg":40,"reps":8,"rpe":7.5,"rest_seconds":90}'::jsonb,
    'workout-update-set-0001'
  )$$,
  'the same set mutation safely replays'
);
select extensions.throws_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'update_set','squat',1,
    '{"completed":false}'::jsonb,'workout-update-set-0001'
  )$$,
  'P0001','idempotency_key_reused','a reused key with changed input is rejected'
);

select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'report_pain',null,null,
    '{"area":"left knee","severity":2}'::jsonb,'workout-pain-00000001'
  )$$,
  'non-severe pain is persisted without closing the session'
);
select extensions.is((select pain_severity::integer from public.workout_sessions),2,'pain severity is saved');

select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'pause',null,null,'{}'::jsonb,'workout-pause-0000001'
  )$$,
  'an active workout can be paused'
);
select extensions.is((select status from public.workout_sessions),'paused','pause survives persistence');
select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'pause',null,null,'{}'::jsonb,'workout-pause-0000001'
  )$$,
  'the original pause response replays while the session is paused'
);
select extensions.throws_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'update_set','squat',2,
    '{"completed":true}'::jsonb,'workout-paused-write-1'
  )$$,
  'P0001','workout_session_closed','set updates are blocked while paused'
);
select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'resume',null,null,'{}'::jsonb,'workout-resume-000001'
  )$$,
  'a paused workout can resume'
);
select extensions.is((select status from public.workout_sessions),'in_progress','resume is persisted');

select extensions.throws_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'substitute_exercise','squat',null,
    '{"exercise_id":"exercise:goblet-squat@v2"}'::jsonb,'workout-invalid-sub-1'
  )$$,
  'P0001','invalid_catalog_substitution','a non-planned substitution is rejected'
);
select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'substitute_exercise','squat',null,
    '{"exercise_id":"exercise:sit-to-stand@v2"}'::jsonb,'workout-valid-sub-001'
  )$$,
  'the governed planned substitution is accepted'
);
select extensions.is(
  (select substitute_exercise_id from public.workout_exercise_logs where exercise_key = 'squat'),
  'exercise:sit-to-stand@v2',
  'the canonical substitution ID is saved'
);

select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'complete_exercise','squat',null,'{}'::jsonb,
    'workout-complete-ex-1'
  )$$,
  'an exercise with a completed set can be completed'
);
select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'skip_exercise','push',null,
    '{"reason":"equipment unavailable"}'::jsonb,'workout-skip-ex-0001'
  )$$,
  'an exercise can be skipped with a reason'
);
select extensions.is((select status from public.workout_exercise_logs where exercise_key='push'),'skipped','skip is saved');
select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'finish',null,null,'{}'::jsonb,'workout-finish-00001'
  )$$,
  'a fully resolved workout can finish'
);
select extensions.is((select status from public.workout_sessions),'completed','finish is persisted');
select extensions.lives_ok(
  $$select public.mutate_workout_session(
    (select id from public.workout_sessions limit 1),'finish',null,null,'{}'::jsonb,'workout-finish-00001'
  )$$,
  'finish safely replays after the session is closed'
);

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select extensions.is((select count(*)::integer from public.workout_sessions),0,'RLS hides another user workout session');

select * from extensions.finish();
rollback;
