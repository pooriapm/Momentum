begin;

alter table public.profiles
  add column if not exists plan_source_preference text not null default 'momentum'
  check (plan_source_preference in ('external', 'momentum'));

create or replace function private.capture_plan_source_preference()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_source text;
begin
  select payload ->> 'planSource' into v_source
  from public.onboarding_drafts
  where user_id = new.user_id;
  if v_source in ('external', 'momentum') then
    new.plan_source_preference := v_source;
  end if;
  return new;
end;
$$;
revoke all on function private.capture_plan_source_preference() from public, anon, authenticated;

drop trigger if exists profiles_capture_plan_source_preference on public.profiles;
create trigger profiles_capture_plan_source_preference
before update of onboarding_status on public.profiles
for each row execute function private.capture_plan_source_preference();

alter table public.plan_versions drop constraint if exists plan_versions_source_check;
alter table public.plan_versions
  add constraint plan_versions_source_check
  check (source in ('openai', 'legacy_import', 'external_import', 'admin'));

create table if not exists public.external_plan_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  plan_id uuid not null,
  plan_version_id uuid not null,
  source_kind text not null check (source_kind in ('external_ai', 'existing_plan')),
  schema_version text not null check (schema_version ~ '^1\.[0-9]+\.[0-9]+$'),
  catalog_release text not null check (char_length(catalog_release) between 1 and 80),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  imported_at timestamptz not null default statement_timestamp(),
  constraint external_plan_imports_plan_owned
    foreign key (plan_id, user_id) references public.plans(id, user_id) on delete cascade,
  constraint external_plan_imports_version_owned
    foreign key (plan_version_id, user_id) references public.plan_versions(id, user_id) on delete cascade
);

create index if not exists external_plan_imports_user_date_idx
  on public.external_plan_imports(user_id, imported_at desc);

alter table public.external_plan_imports enable row level security;
create policy external_plan_imports_select_own on public.external_plan_imports
  for select to authenticated using (user_id = auth.uid());
revoke all on public.external_plan_imports from public, anon, authenticated;
grant select on public.external_plan_imports to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.external_plan_imports from service_role;
grant select on public.external_plan_imports to service_role;

create or replace function public.persist_external_plan(
  p_user_id uuid,
  p_idempotency_key text,
  p_goal_id uuid,
  p_plan_name text,
  p_valid_from date,
  p_valid_to date,
  p_locale text,
  p_schema_version text,
  p_catalog_release text,
  p_source_kind text,
  p_content jsonb,
  p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_profile public.profiles%rowtype;
  v_plan_id uuid;
  v_version_id uuid;
  v_import_id uuid;
  v_now timestamptz := statement_timestamp();
  v_response jsonb;
begin
  if p_user_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or char_length(trim(p_plan_name)) not between 1 and 240
    or p_valid_to < p_valid_from
    or p_valid_to - p_valid_from > 31
    or p_locale not in ('fa-IR', 'en-US')
    or p_schema_version !~ '^1\.[0-9]+\.[0-9]+$'
    or char_length(p_catalog_release) not between 1 and 80
    or p_source_kind not in ('external_ai', 'existing_plan')
    or jsonb_typeof(p_content) <> 'object'
    or p_content_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_external_plan' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'import-external-plan'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_content_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  select * into v_profile from public.profiles where user_id = p_user_id for update;
  if v_profile.user_id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if v_profile.onboarding_status <> 'complete' then
    raise exception 'onboarding_incomplete' using errcode = 'P0001';
  end if;
  if v_profile.plan_source_preference <> 'external' then
    raise exception 'external_plan_path_not_selected' using errcode = 'P0001';
  end if;

  insert into public.plans(user_id, goal_id, name, status, valid_from, valid_to, locale)
  values (p_user_id, p_goal_id, trim(p_plan_name), 'draft', p_valid_from, p_valid_to, p_locale)
  returning id into v_plan_id;

  insert into public.plan_versions(
    plan_id, user_id, version, schema_version, source, prompt_version, model, content, content_sha256
  ) values (
    v_plan_id, p_user_id, 1, p_schema_version, 'external_import',
    'external-import-v1', null, p_content, p_content_sha256
  ) returning id into v_version_id;

  update public.plans
  set status = 'archived'
  where user_id = p_user_id and id <> v_plan_id and status = 'active'
    and daterange(valid_from, valid_to, '[]') && daterange(p_valid_from, p_valid_to, '[]');

  update public.plans
  set active_version_id = v_version_id, status = 'active'
  where id = v_plan_id;

  insert into public.external_plan_imports(
    user_id, plan_id, plan_version_id, source_kind, schema_version, catalog_release, content_sha256
  ) values (
    p_user_id, v_plan_id, v_version_id, p_source_kind, p_schema_version, p_catalog_release, p_content_sha256
  ) returning id into v_import_id;

  v_response := jsonb_build_object(
    'import_id', v_import_id,
    'plan_id', v_plan_id,
    'plan_version_id', v_version_id,
    'imported_at', v_now
  );

  insert into private.account_mutation_keys(
    user_id, action, idempotency_key, request_sha256, response_payload
  ) values (
    p_user_id, 'import-external-plan', p_idempotency_key, p_content_sha256, v_response
  );

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id, 'plan.external_imported', 'user',
    jsonb_build_object('plan_id', v_plan_id, 'plan_version_id', v_version_id, 'source_kind', p_source_kind)
  );

  return v_response;
end;
$$;

revoke all on function public.persist_external_plan(
  uuid, text, uuid, text, date, date, text, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_external_plan(
  uuid, text, uuid, text, date, date, text, text, text, text, jsonb, text
) to service_role;

commit;
