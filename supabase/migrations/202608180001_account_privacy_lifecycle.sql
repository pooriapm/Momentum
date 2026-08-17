begin;

-- Launch-ready account privacy: server consent versions, durable export/delete
-- requests, and a payment-method placeholder. No Stripe checkout.

-- ---------------------------------------------------------------------------
-- 1. Current legal document versions (server authority)
-- ---------------------------------------------------------------------------
create table if not exists public.legal_document_versions (
  document_key text primary key check (document_key in ('terms', 'privacy', 'health')),
  version text not null check (char_length(version) between 1 and 80),
  effective_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create trigger legal_document_versions_set_updated_at
before update on public.legal_document_versions
for each row execute function public.set_updated_at();

insert into public.legal_document_versions(document_key, version)
values
  ('terms', '2026-08-01-alpha'),
  ('privacy', '2026-08-01-alpha'),
  ('health', '2026-08-01-alpha')
on conflict (document_key) do nothing;

alter table public.legal_document_versions enable row level security;
revoke all on table public.legal_document_versions from public, anon, authenticated;
grant select on table public.legal_document_versions to anon, authenticated;

create policy legal_document_versions_select_current
on public.legal_document_versions for select to anon, authenticated
using (true);

create or replace function public.current_legal_document_versions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_terms text;
  v_privacy text;
  v_health text;
begin
  select version into v_terms from public.legal_document_versions where document_key = 'terms';
  select version into v_privacy from public.legal_document_versions where document_key = 'privacy';
  select version into v_health from public.legal_document_versions where document_key = 'health';
  if v_terms is null or v_privacy is null or v_health is null then
    raise exception 'consent_policy_not_configured' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'terms', v_terms,
    'privacy', v_privacy,
    'health', v_health
  );
end;
$$;

revoke all on function public.current_legal_document_versions() from public;
grant execute on function public.current_legal_document_versions() to anon, authenticated, service_role;

create or replace function private.assert_current_legal_versions(
  p_terms_version text,
  p_privacy_version text,
  p_health_consent_version text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_current jsonb := public.current_legal_document_versions();
begin
  if p_terms_version is distinct from (v_current ->> 'terms')
    or p_privacy_version is distinct from (v_current ->> 'privacy')
    or p_health_consent_version is distinct from (v_current ->> 'health')
  then
    raise exception 'consent_version_stale' using errcode = 'P0001';
  end if;
  return v_current;
end;
$$;

revoke all on function private.assert_current_legal_versions(text, text, text)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Payment-method placeholder (not collected until checkout exists)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists payment_method_status text;

update public.profiles
set payment_method_status = coalesce(payment_method_status, 'not_collected')
where payment_method_status is null;

alter table public.profiles
  alter column payment_method_status set default 'not_collected';

alter table public.profiles
  alter column payment_method_status set not null;

alter table public.profiles drop constraint if exists profiles_payment_method_status_check;
alter table public.profiles
  add constraint profiles_payment_method_status_check
  check (payment_method_status = 'not_collected');

create or replace function public.account_payment_method_status(p_user_id uuid default auth.uid())
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_caller uuid := auth.uid();
begin
  if p_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if v_caller is not null and v_caller is distinct from p_user_id then
    raise exception 'payment_method_forbidden' using errcode = '42501';
  end if;
  select payment_method_status into v_status
  from public.profiles
  where user_id = p_user_id;
  if v_status is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  return v_status;
end;
$$;

revoke all on function public.account_payment_method_status(uuid) from public, anon;
grant execute on function public.account_payment_method_status(uuid) to authenticated, service_role;

-- Gift generation stays allowed. Paid generation remains blocked until 5a
-- records a collected method; this helper is the hook, not a Stripe integration.
create or replace function private.payment_method_blocks_paid_generation(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.entitlements e on e.user_id = p.user_id
    where p.user_id = p_user_id
      and p.payment_method_status = 'not_collected'
      and e.source = 'subscription'
      and e.status = 'active'
      and statement_timestamp() >= e.period_start
      and statement_timestamp() < e.period_end
  );
$$;

revoke all on function private.payment_method_blocks_paid_generation(uuid)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Export requests (pending / ready / expired)
-- ---------------------------------------------------------------------------
create table if not exists public.export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('pending', 'ready', 'expired', 'failed')),
  requested_at timestamptz not null default statement_timestamp(),
  ready_at timestamptz,
  expires_at timestamptz,
  failed_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) between 1 and 80),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint export_requests_ready_window check (
    (status = 'ready' and ready_at is not null and expires_at is not null)
    or status <> 'ready'
  ),
  constraint export_requests_failed_reason check (
    (status = 'failed' and failed_at is not null and error_code is not null)
    or status <> 'failed'
  )
);

create unique index if not exists export_requests_one_active_per_user
on public.export_requests(user_id)
where status in ('pending', 'ready');

create index if not exists export_requests_user_requested_idx
on public.export_requests(user_id, requested_at desc);

create trigger export_requests_set_updated_at
before update on public.export_requests
for each row execute function public.set_updated_at();

create table if not exists private.export_artifacts (
  request_id uuid primary key references public.export_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 16777216),
  created_at timestamptz not null default statement_timestamp()
);

alter table public.export_requests enable row level security;
revoke all on table public.export_requests from public, anon, authenticated;
grant select on table public.export_requests to authenticated;

create policy export_requests_select_own
on public.export_requests for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.export_request_projection(p_row public.export_requests)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'status', p_row.status,
    'requested_at', p_row.requested_at,
    'ready_at', p_row.ready_at,
    'expires_at', p_row.expires_at,
    'error_code', p_row.error_code
  );
$$;

revoke all on function private.export_request_projection(public.export_requests)
from public, anon, authenticated;

create or replace function public.expire_account_exports(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.export_requests
    set
      status = 'expired',
      error_code = null
    where status = 'ready'
      and expires_at <= statement_timestamp()
      and (p_user_id is null or user_id = p_user_id)
    returning id
  )
  select count(*)::integer into v_count from expired;

  delete from private.export_artifacts a
  using public.export_requests r
  where a.request_id = r.id
    and r.status = 'expired'
    and (p_user_id is null or r.user_id = p_user_id);

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.expire_account_exports(uuid) from public, anon, authenticated;
grant execute on function public.expire_account_exports(uuid) to service_role;

create or replace function public.request_account_export(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.export_requests%rowtype;
begin
  if p_user_id is null then
    raise exception 'invalid_export_arguments' using errcode = '22023';
  end if;

  perform public.expire_account_exports(p_user_id);

  select * into v_row
  from public.export_requests
  where user_id = p_user_id
    and status in ('pending', 'ready')
  order by requested_at desc
  limit 1
  for update;

  if v_row.id is not null then
    return private.export_request_projection(v_row);
  end if;

  begin
    insert into public.export_requests(user_id, status)
    values (p_user_id, 'pending')
    returning * into v_row;
  exception
    when unique_violation then
      select * into v_row
      from public.export_requests
      where user_id = p_user_id
        and status in ('pending', 'ready')
      order by requested_at desc
      limit 1;
  end;

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'account.export_requested',
    'service',
    jsonb_build_object('request_id', v_row.id)
  );

  return private.export_request_projection(v_row);
end;
$$;

revoke all on function public.request_account_export(uuid) from public, anon, authenticated;
grant execute on function public.request_account_export(uuid) to service_role;

create or replace function public.finalize_account_export(
  p_user_id uuid,
  p_request_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.export_requests%rowtype;
begin
  if p_user_id is null
    or p_request_id is null
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception 'invalid_export_arguments' using errcode = '22023';
  end if;

  select * into v_row
  from public.export_requests
  where id = p_request_id
    and user_id = p_user_id
  for update;

  if v_row.id is null then
    raise exception 'export_request_not_found' using errcode = 'P0002';
  end if;

  if v_row.status = 'ready' and v_row.expires_at > statement_timestamp() then
    insert into private.export_artifacts(request_id, user_id, payload)
    values (v_row.id, p_user_id, p_payload)
    on conflict (request_id) do update
    set payload = excluded.payload;
    return private.export_request_projection(v_row);
  end if;

  if v_row.status <> 'pending' then
    raise exception 'export_request_not_pending' using errcode = 'P0001';
  end if;

  update public.export_requests
  set
    status = 'ready',
    ready_at = statement_timestamp(),
    expires_at = statement_timestamp() + interval '24 hours',
    failed_at = null,
    error_code = null
  where id = v_row.id
  returning * into v_row;

  insert into private.export_artifacts(request_id, user_id, payload)
  values (v_row.id, p_user_id, p_payload)
  on conflict (request_id) do update
  set payload = excluded.payload;

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'account.export_ready',
    'service',
    jsonb_build_object('request_id', v_row.id, 'expires_at', v_row.expires_at)
  );

  return private.export_request_projection(v_row);
end;
$$;

revoke all on function public.finalize_account_export(uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.finalize_account_export(uuid, uuid, jsonb) to service_role;

create or replace function public.fail_account_export(
  p_user_id uuid,
  p_request_id uuid,
  p_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.export_requests%rowtype;
  v_code text := left(trim(coalesce(p_error_code, 'account_export_failed')), 80);
begin
  select * into v_row
  from public.export_requests
  where id = p_request_id
    and user_id = p_user_id
  for update;

  if v_row.id is null then
    raise exception 'export_request_not_found' using errcode = 'P0002';
  end if;
  if v_row.status not in ('pending', 'failed') then
    return private.export_request_projection(v_row);
  end if;

  update public.export_requests
  set
    status = 'failed',
    failed_at = statement_timestamp(),
    error_code = v_code
  where id = v_row.id
  returning * into v_row;

  delete from private.export_artifacts where request_id = v_row.id;

  return private.export_request_projection(v_row);
end;
$$;

revoke all on function public.fail_account_export(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.fail_account_export(uuid, uuid, text) to service_role;

create or replace function public.get_account_export(
  p_user_id uuid,
  p_include_artifact boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.export_requests%rowtype;
  v_payload jsonb;
begin
  if p_user_id is null then
    raise exception 'invalid_export_arguments' using errcode = '22023';
  end if;

  perform public.expire_account_exports(p_user_id);

  select * into v_row
  from public.export_requests
  where user_id = p_user_id
  order by requested_at desc
  limit 1;

  if v_row.id is null then
    return jsonb_build_object('export_request', null);
  end if;

  if p_include_artifact and v_row.status = 'ready' then
    select payload into v_payload
    from private.export_artifacts
    where request_id = v_row.id
      and user_id = p_user_id;
  end if;

  return jsonb_build_object(
    'export_request', private.export_request_projection(v_row),
    'export', v_payload
  );
end;
$$;

revoke all on function public.get_account_export(uuid, boolean)
from public, anon, authenticated;
grant execute on function public.get_account_export(uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Deletion requests + anonymized receipts
-- ---------------------------------------------------------------------------
create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('pending', 'completed', 'failed')),
  requested_at timestamptz not null default statement_timestamp(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  sessions_revoked_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) between 1 and 80),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint deletion_requests_one_user unique (user_id),
  constraint deletion_requests_pending_confirm check (
    (status = 'pending' and confirmed_at is not null)
    or status <> 'pending'
  )
);

create trigger deletion_requests_set_updated_at
before update on public.deletion_requests
for each row execute function public.set_updated_at();

create table if not exists private.deletion_receipts (
  id uuid primary key default gen_random_uuid(),
  account_hash text not null check (account_hash ~ '^[a-f0-9]{64}$'),
  policy_version text not null check (char_length(policy_version) between 1 and 80),
  result text not null check (result in ('completed', 'failed')),
  completed_at timestamptz not null default statement_timestamp(),
  constraint deletion_receipts_account_hash unique (account_hash)
);

alter table public.deletion_requests enable row level security;
revoke all on table public.deletion_requests from public, anon, authenticated;
grant select on table public.deletion_requests to authenticated;

create policy deletion_requests_select_own
on public.deletion_requests for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.deletion_request_projection(p_row public.deletion_requests)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'status', p_row.status,
    'requested_at', p_row.requested_at,
    'confirmed_at', p_row.confirmed_at,
    'completed_at', p_row.completed_at,
    'sessions_revoked_at', p_row.sessions_revoked_at,
    'error_code', p_row.error_code
  );
$$;

revoke all on function private.deletion_request_projection(public.deletion_requests)
from public, anon, authenticated;

create or replace function public.begin_account_deletion(
  p_user_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.deletion_requests%rowtype;
begin
  if p_user_id is null then
    raise exception 'invalid_deletion_arguments' using errcode = '22023';
  end if;
  if p_confirmation is distinct from 'DELETE' then
    raise exception 'delete_confirmation_required' using errcode = '22023';
  end if;

  select * into v_row
  from public.deletion_requests
  where user_id = p_user_id
  for update;

  if v_row.status = 'pending' then
    return private.deletion_request_projection(v_row);
  end if;

  if v_row.id is null then
    insert into public.deletion_requests(
      user_id, status, confirmed_at
    ) values (
      p_user_id, 'pending', statement_timestamp()
    )
    returning * into v_row;
  else
    update public.deletion_requests
    set
      status = 'pending',
      confirmed_at = statement_timestamp(),
      failed_at = null,
      error_code = null
    where id = v_row.id
    returning * into v_row;
  end if;

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'account.deletion_requested',
    'service',
    jsonb_build_object('request_id', v_row.id)
  );

  return private.deletion_request_projection(v_row);
end;
$$;

revoke all on function public.begin_account_deletion(uuid, text)
from public, anon, authenticated;
grant execute on function public.begin_account_deletion(uuid, text) to service_role;

create or replace function public.mark_account_deletion_sessions_revoked(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.deletion_requests%rowtype;
begin
  update public.deletion_requests
  set sessions_revoked_at = coalesce(sessions_revoked_at, statement_timestamp())
  where user_id = p_user_id
    and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'deletion_request_not_found' using errcode = 'P0002';
  end if;
  return private.deletion_request_projection(v_row);
end;
$$;

revoke all on function public.mark_account_deletion_sessions_revoked(uuid)
from public, anon, authenticated;
grant execute on function public.mark_account_deletion_sessions_revoked(uuid)
to service_role;

create or replace function public.fail_account_deletion(p_user_id uuid, p_error_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.deletion_requests%rowtype;
  v_code text := left(trim(coalesce(p_error_code, 'account_delete_failed')), 80);
begin
  update public.deletion_requests
  set
    status = 'failed',
    failed_at = statement_timestamp(),
    error_code = v_code
  where user_id = p_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'deletion_request_not_found' using errcode = 'P0002';
  end if;
  return private.deletion_request_projection(v_row);
end;
$$;

revoke all on function public.fail_account_deletion(uuid, text)
from public, anon, authenticated;
grant execute on function public.fail_account_deletion(uuid, text) to service_role;

create or replace function public.record_deletion_receipt(
  p_account_hash text,
  p_result text,
  p_policy_version text default 'momentum-deletion-receipt-v1'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_receipt private.deletion_receipts%rowtype;
begin
  if p_account_hash !~ '^[a-f0-9]{64}$'
    or p_result not in ('completed', 'failed')
    or char_length(trim(coalesce(p_policy_version, ''))) not between 1 and 80
  then
    raise exception 'invalid_deletion_receipt' using errcode = '22023';
  end if;

  insert into private.deletion_receipts(account_hash, policy_version, result)
  values (p_account_hash, trim(p_policy_version), p_result)
  on conflict (account_hash) do update
  set
    result = excluded.result,
    policy_version = excluded.policy_version,
    completed_at = statement_timestamp()
  returning * into v_receipt;

  return jsonb_build_object(
    'id', v_receipt.id,
    'result', v_receipt.result,
    'policy_version', v_receipt.policy_version,
    'completed_at', v_receipt.completed_at
  );
end;
$$;

revoke all on function public.record_deletion_receipt(text, text, text)
from public, anon, authenticated;
grant execute on function public.record_deletion_receipt(text, text, text)
to service_role;

create or replace function public.get_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row public.deletion_requests%rowtype;
begin
  if p_user_id is null then
    raise exception 'invalid_deletion_arguments' using errcode = '22023';
  end if;
  select * into v_row
  from public.deletion_requests
  where user_id = p_user_id;
  return jsonb_build_object(
    'deletion_request',
    case when v_row.id is null then null else private.deletion_request_projection(v_row) end
  );
end;
$$;

revoke all on function public.get_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.get_account_deletion(uuid) to service_role;

commit;
