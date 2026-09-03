begin;
set local role postgres;
set local search_path = extensions, public;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.purge_expired_body_reports()',
    'EXECUTE'
  ),
  'browser cannot prune private body reports'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'public.purge_expired_body_reports()',
    'EXECUTE'
  ),
  'Edge service can prune expired body reports'
);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values (
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  'body-report-retention@example.com',
  statement_timestamp(),
  '{}'::jsonb,
  '{"locale":"en-US","country_code":"US"}'::jsonb,
  statement_timestamp(),
  statement_timestamp(),
  false,
  false
);

insert into public.body_composition_measurements(
  id, user_id, measured_at, source_type, report_object_path, extraction_status, created_at
) values (
  '4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b',
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  statement_timestamp() - interval '40 days',
  'pdf',
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a/stale.pdf',
  'pending',
  statement_timestamp() - interval '40 days'
);

insert into public.body_composition_measurements(
  id, user_id, measured_at, source_type, report_object_path, extraction_status, created_at
) values (
  '4c4c4c4c-4c4c-44c4-84c4-4c4c4c4c4c4c',
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  statement_timestamp(),
  'pdf',
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a/fresh.pdf',
  'pending',
  statement_timestamp()
);

insert into public.body_composition_measurements(
  id, user_id, measured_at, source_type, weight_kg, report_object_path,
  extraction_status, extraction_result, created_at
) values (
  '4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d',
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  statement_timestamp() - interval '40 days',
  'pdf',
  72.5,
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a/confirmed.pdf',
  'confirmed',
  '{"source":"manual"}'::jsonb,
  statement_timestamp() - interval '40 days'
);

select extensions.is(
  public.purge_expired_body_reports(),
  jsonb_build_object(
    'deleted_rows', 1,
    'paths', jsonb_build_array('4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a/stale.pdf'),
    'retention_days', 30
  ),
  'stale unconfirmed reports are returned for Storage deletion'
);
select extensions.is(
  (public.purge_expired_body_reports() ->> 'deleted_rows')::integer,
  0,
  'a second purge finds no additional expired reports'
);

select extensions.is(
  (select count(*)::integer from public.body_composition_measurements
    where id = '4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b'),
  0,
  'stale unconfirmed body reports are purged'
);
select extensions.is(
  (select count(*)::integer from public.body_composition_measurements
    where id = '4c4c4c4c-4c4c-44c4-84c4-4c4c4c4c4c4c'),
  1,
  'fresh unconfirmed body reports are retained'
);
select extensions.is(
  (select count(*)::integer from public.body_composition_measurements
    where id = '4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d'),
  1,
  'confirmed body measurements are retained until account deletion'
);
select extensions.is(
  (
    select report_object_path
    from public.body_composition_measurements
    where id = '4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d'
  ),
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a/confirmed.pdf',
  'confirmed private report paths remain until the account is deleted'
);

select * from extensions.finish();
rollback;
