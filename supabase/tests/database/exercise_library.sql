begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('88888888-8888-4888-8888-888888888888', 'exercise-media@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"fa-IR","country_code":"IR","product_region":"ir"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false);

select extensions.ok(
  (select public and allowed_mime_types = array['application/zip']
    from storage.buckets where id = 'exercise-media'),
  'exercise-media is a public bucket that only accepts zip files'
);
select extensions.is(
  (select count(*)::integer from pg_catalog.pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%exercise-media%'),
  0,
  'no client policy can list or write exercise media'
);

insert into storage.objects(bucket_id, name) values ('exercise-media', 'v1/library.zip');

set local role authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);
select extensions.throws_like(
  $$insert into storage.objects(bucket_id, name) values ('exercise-media', 'v1/anim/evil.zip')$$,
  '%row-level security policy%',
  'signed-in users cannot upload exercise media'
);
select extensions.is(
  (select count(*)::integer from storage.objects where bucket_id = 'exercise-media'),
  0,
  'signed-in users cannot list exercise media through the API'
);
select extensions.is_empty(
  $$update storage.objects set name = 'v1/library-2.zip'
    where bucket_id = 'exercise-media' returning name$$,
  'signed-in users cannot rename exercise media'
);

set local role anon;
select extensions.throws_like(
  $$insert into storage.objects(bucket_id, name) values ('exercise-media', 'v1/anim/evil.zip')$$,
  '%row-level security policy%',
  'anonymous clients cannot upload exercise media'
);

set local role postgres;
select extensions.ok(
  (select count(*) >= 316 from public.exercise_catalog
    where catalog_release_id = 'momentum-core@v2' and active),
  'the v2 catalog carries the whole exercise library'
);
select extensions.is(
  (select count(*)::integer from public.exercise_catalog e
    where e.catalog_release_id = 'momentum-core@v2'
      and not exists (select 1 from public.exercise_equipment ee where ee.exercise_id = e.id)),
  0,
  'every library exercise lists equipment'
);
select extensions.is(
  (select name_fa from public.exercise_catalog where id = 'exercise:barbell-bench-press@v2'),
  'پرس سینه هالتر',
  'library exercises keep their Persian display name'
);
select extensions.is(
  (select name_fa from public.exercise_catalog where id = 'exercise:bodyweight-squat@v2'),
  'اسکوات با وزن بدن',
  'existing catalog rows are not rewritten by the library import'
);

select * from extensions.finish();
rollback;
