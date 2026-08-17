begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'privacy@example.com',
  statement_timestamp(),
  '{}'::jsonb,
  '{"locale":"en-US","country_code":"US"}'::jsonb,
  statement_timestamp(),
  statement_timestamp(),
  false,
  false
);

select extensions.is(
  (select version from public.legal_document_versions where document_key = 'terms'),
  '2026-08-01-alpha',
  'current terms version is stored on the server'
);
select extensions.is(
  public.current_legal_document_versions() ->> 'health',
  '2026-08-01-alpha',
  'consent versions are readable without a client constant'
);
select extensions.throws_ok(
  $$select private.assert_current_legal_versions('stale-terms', '2026-08-01-alpha', '2026-08-01-alpha')$$,
  'P0001',
  'consent_version_stale',
  'stale consent versions are rejected'
);

select extensions.is(
  public.account_payment_method_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'not_collected',
  'payment method stays not_collected until checkout exists'
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.request_account_export(uuid)',
    'EXECUTE'
  ),
  'browser cannot create export requests directly'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.begin_account_deletion(uuid,text)',
    'EXECUTE'
  ),
  'browser cannot start account deletion directly'
);

select extensions.is(
  public.request_account_export('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') ->> 'status',
  'pending',
  'an export request starts as pending'
);
select extensions.is(
  public.request_account_export('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') ->> 'status',
  'pending',
  'a second export request reuses the pending row'
);
select extensions.is(
  (
    select count(*)::integer
    from public.export_requests
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and status = 'pending'
  ),
  1,
  'duplicate export requests do not create extra rows'
);

select extensions.is(
  public.finalize_account_export(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (select id from public.export_requests where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' limit 1),
    '{"schema_version":"momentum-account-export-v1"}'::jsonb
  ) ->> 'status',
  'ready',
  'a prepared export is marked ready'
);
select extensions.is(
  public.get_account_export('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true) -> 'export' ->> 'schema_version',
  'momentum-account-export-v1',
  'a ready export can be downloaded from the stored artifact'
);

update public.export_requests
set expires_at = statement_timestamp() - interval '1 minute'
where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select extensions.is(
  public.get_account_export('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true) -> 'export_request' ->> 'status',
  'expired',
  'an overdue export becomes expired on read'
);

select extensions.throws_ok(
  $$select public.begin_account_deletion('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'nope')$$,
  '22023',
  'delete_confirmation_required',
  'deletion requires the DELETE confirmation phrase'
);
select extensions.is(
  public.begin_account_deletion('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'DELETE') ->> 'status',
  'pending',
  'confirmed deletion is recorded as a pending workflow'
);
select extensions.is(
  public.mark_account_deletion_sessions_revoked('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') ->> 'status',
  'pending',
  'session revocation is recorded on the deletion request'
);

select * from extensions.finish();
rollback;
