begin;

alter table public.plan_versions
  add column change_reason jsonb not null default '{}'::jsonb
    check (jsonb_typeof(change_reason) = 'object' and octet_length(change_reason::text) <= 8192);

alter table public.plan_versions drop constraint plan_versions_source_check;
alter table public.plan_versions add constraint plan_versions_source_check
  check (source in ('openai', 'coach_revision', 'recalibration', 'legacy_import', 'admin'));

create table public.plan_recalibrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  plan_id uuid not null,
  from_version_id uuid not null,
  candidate_version_id uuid not null,
  status text not null default 'preview'
    check (status in ('preview', 'active', 'cancelled', 'expired', 'rolled_back')),
  trigger_source text not null
    check (trigger_source in ('daily_trend', 'weekly_checkin', 'mixed')),
  change_reason jsonb not null
    check (jsonb_typeof(change_reason) = 'object' and octet_length(change_reason::text) <= 8192),
  trend_snapshot jsonb not null
    check (jsonb_typeof(trend_snapshot) = 'object' and octet_length(trend_snapshot::text) <= 16384),
  diff jsonb not null
    check (jsonb_typeof(diff) = 'object' and octet_length(diff::text) <= 65536),
  expires_at timestamptz not null default (statement_timestamp() + interval '24 hours'),
  confirmed_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint plan_recalibrations_plan_owned
    foreign key (plan_id, user_id) references public.plans(id, user_id) on delete cascade,
  constraint plan_recalibrations_from_owned
    foreign key (from_version_id, user_id) references public.plan_versions(id, user_id),
  constraint plan_recalibrations_candidate_owned
    foreign key (candidate_version_id, user_id) references public.plan_versions(id, user_id),
  constraint plan_recalibrations_distinct_versions check (from_version_id <> candidate_version_id),
  constraint plan_recalibrations_state_dates check (
    (status = 'active' and confirmed_at is not null and rolled_back_at is null)
    or (status = 'rolled_back' and confirmed_at is not null and rolled_back_at is not null)
    or (status in ('preview', 'cancelled', 'expired') and rolled_back_at is null)
  )
);

create unique index plan_recalibrations_one_preview_idx
on public.plan_recalibrations(plan_id) where status = 'preview';
create index plan_recalibrations_user_created_idx
on public.plan_recalibrations(user_id, created_at desc);

create trigger plan_recalibrations_set_updated_at
before update on public.plan_recalibrations
for each row execute function public.set_updated_at();

alter table public.plan_recalibrations enable row level security;
revoke all on public.plan_recalibrations from anon, authenticated;
grant select on public.plan_recalibrations to authenticated;
create policy plan_recalibrations_select_own
on public.plan_recalibrations for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.create_plan_recalibration_preview(
  p_user_id uuid,
  p_plan_id uuid,
  p_from_version_id uuid,
  p_content jsonb,
  p_content_sha256 text,
  p_change_reason jsonb,
  p_trend_snapshot jsonb,
  p_diff jsonb,
  p_trigger_source text,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_plan public.plans%rowtype;
  v_from public.plan_versions%rowtype;
  v_candidate_id uuid;
  v_revision_id uuid;
  v_version integer;
  v_response jsonb;
begin
  if p_user_id is null or p_plan_id is null or p_from_version_id is null
    or jsonb_typeof(p_content) <> 'object'
    or jsonb_typeof(p_change_reason) <> 'object'
    or jsonb_typeof(p_trend_snapshot) <> 'object'
    or jsonb_typeof(p_diff) <> 'object'
    or p_content_sha256 !~ '^[a-f0-9]{64}$'
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
    or p_trigger_source not in ('daily_trend', 'weekly_checkin', 'mixed')
    or char_length(p_idempotency_key) not between 8 and 128
  then
    raise exception 'invalid_recalibration_arguments' using errcode = '22023';
  end if;

  select * into v_existing from private.account_mutation_keys
  where user_id = p_user_id and action = 'preview-plan-recalibration'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  if not exists (
    select 1 from public.entitlements
    where user_id = p_user_id and status in ('trial', 'active')
      and period_start <= statement_timestamp() and period_end > statement_timestamp()
  ) then
    raise exception 'active_entitlement_required' using errcode = 'P0001';
  end if;

  select * into v_plan from public.plans
  where id = p_plan_id and user_id = p_user_id and status = 'active'
  for update;
  if v_plan.id is null then raise exception 'active_plan_not_found' using errcode = 'P0002'; end if;
  if v_plan.active_version_id <> p_from_version_id then
    raise exception 'plan_version_changed' using errcode = 'P0001';
  end if;
  update public.plan_recalibrations
  set status = 'expired'
  where plan_id = p_plan_id and status = 'preview' and expires_at <= statement_timestamp();
  if exists (select 1 from public.plan_recalibrations where plan_id = p_plan_id and status = 'preview') then
    raise exception 'recalibration_preview_exists' using errcode = 'P0001';
  end if;

  select * into v_from from public.plan_versions
  where id = p_from_version_id and plan_id = p_plan_id and user_id = p_user_id;
  if v_from.id is null then raise exception 'plan_version_not_found' using errcode = 'P0002'; end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.plan_versions where plan_id = p_plan_id;
  insert into public.plan_versions(
    plan_id, user_id, version, schema_version, source, prompt_version, model,
    content, content_sha256, change_reason
  ) values (
    p_plan_id, p_user_id, v_version, v_from.schema_version, 'recalibration', null, null,
    p_content, p_content_sha256, p_change_reason
  ) returning id into v_candidate_id;

  insert into public.plan_recalibrations(
    user_id, plan_id, from_version_id, candidate_version_id, trigger_source,
    change_reason, trend_snapshot, diff
  ) values (
    p_user_id, p_plan_id, p_from_version_id, v_candidate_id, p_trigger_source,
    p_change_reason, p_trend_snapshot, p_diff
  ) returning id into v_revision_id;

  v_response := jsonb_build_object(
    'revision_id', v_revision_id, 'status', 'preview',
    'plan_id', p_plan_id, 'from_version_id', p_from_version_id,
    'candidate_version_id', v_candidate_id, 'candidate_version', v_version,
    'change_reason', p_change_reason, 'diff', p_diff,
    'expires_at', statement_timestamp() + interval '24 hours'
  );
  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (p_user_id, 'plan.recalibration_previewed', 'user', jsonb_build_object(
    'revision_id', v_revision_id, 'plan_id', p_plan_id,
    'from_version_id', p_from_version_id, 'candidate_version_id', v_candidate_id,
    'trigger_source', p_trigger_source
  ));
  insert into private.account_mutation_keys(
    user_id, action, idempotency_key, request_sha256, response_payload
  ) values (
    p_user_id, 'preview-plan-recalibration', p_idempotency_key, p_request_sha256, v_response
  );
  return v_response;
exception when unique_violation then
  select * into v_existing from private.account_mutation_keys
  where user_id = p_user_id and action = 'preview-plan-recalibration'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null and v_existing.request_sha256 = p_request_sha256 then
    return v_existing.response_payload;
  end if;
  raise;
end;
$$;

create or replace function public.confirm_plan_recalibration(
  p_user_id uuid,
  p_revision_id uuid,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_revision public.plan_recalibrations%rowtype;
  v_plan public.plans%rowtype;
  v_response jsonb;
begin
  if p_user_id is null or p_revision_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_recalibration_arguments' using errcode = '22023'; end if;
  select * into v_existing from private.account_mutation_keys
  where user_id = p_user_id and action = 'confirm-plan-recalibration'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;
  select * into v_revision from public.plan_recalibrations
  where id = p_revision_id and user_id = p_user_id for update;
  if v_revision.id is null then raise exception 'recalibration_not_found' using errcode = 'P0002'; end if;
  if v_revision.status <> 'preview' then raise exception 'recalibration_not_preview' using errcode = 'P0001'; end if;
  if v_revision.expires_at <= statement_timestamp() then
    update public.plan_recalibrations set status = 'expired' where id = v_revision.id;
    raise exception 'recalibration_preview_expired' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.entitlements where user_id = p_user_id
      and status in ('trial', 'active') and period_start <= statement_timestamp()
      and period_end > statement_timestamp()
  ) then raise exception 'active_entitlement_required' using errcode = 'P0001'; end if;
  select * into v_plan from public.plans where id = v_revision.plan_id and user_id = p_user_id for update;
  if v_plan.active_version_id <> v_revision.from_version_id then
    raise exception 'plan_version_changed' using errcode = 'P0001';
  end if;
  update public.plans set active_version_id = v_revision.candidate_version_id
  where id = v_revision.plan_id and user_id = p_user_id;
  update public.plan_recalibrations
  set status = 'active', confirmed_at = statement_timestamp()
  where id = v_revision.id;
  v_response := jsonb_build_object(
    'revision_id', v_revision.id, 'status', 'active', 'plan_id', v_revision.plan_id,
    'active_version_id', v_revision.candidate_version_id,
    'rollback_version_id', v_revision.from_version_id
  );
  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (p_user_id, 'plan.recalibration_confirmed', 'user', jsonb_build_object(
    'revision_id', v_revision.id, 'plan_id', v_revision.plan_id,
    'active_version_id', v_revision.candidate_version_id
  ));
  insert into private.account_mutation_keys(user_id, action, idempotency_key, request_sha256, response_payload)
  values (p_user_id, 'confirm-plan-recalibration', p_idempotency_key, p_request_sha256, v_response);
  return v_response;
end;
$$;

create or replace function public.rollback_plan_recalibration(
  p_user_id uuid,
  p_revision_id uuid,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_revision public.plan_recalibrations%rowtype;
  v_plan public.plans%rowtype;
  v_response jsonb;
begin
  if p_user_id is null or p_revision_id is null
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then raise exception 'invalid_recalibration_arguments' using errcode = '22023'; end if;
  select * into v_existing from private.account_mutation_keys
  where user_id = p_user_id and action = 'rollback-plan-recalibration'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;
  select * into v_revision from public.plan_recalibrations
  where id = p_revision_id and user_id = p_user_id for update;
  if v_revision.id is null then raise exception 'recalibration_not_found' using errcode = 'P0002'; end if;
  if v_revision.status <> 'active' then raise exception 'recalibration_not_active' using errcode = 'P0001'; end if;
  select * into v_plan from public.plans where id = v_revision.plan_id and user_id = p_user_id for update;
  if v_plan.active_version_id <> v_revision.candidate_version_id then
    raise exception 'plan_version_changed' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.daily_meal_status
    where user_id = p_user_id and plan_version_id = v_revision.candidate_version_id
      and status = 'completed'
  ) or exists (
    select 1 from public.workout_sessions
    where user_id = p_user_id and plan_version_id = v_revision.candidate_version_id
  ) then
    raise exception 'recalibration_activity_locked' using errcode = 'P0001';
  end if;
  update public.plans set active_version_id = v_revision.from_version_id
  where id = v_revision.plan_id and user_id = p_user_id;
  update public.plan_recalibrations
  set status = 'rolled_back', rolled_back_at = statement_timestamp()
  where id = v_revision.id;
  v_response := jsonb_build_object(
    'revision_id', v_revision.id, 'status', 'rolled_back', 'plan_id', v_revision.plan_id,
    'active_version_id', v_revision.from_version_id
  );
  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (p_user_id, 'plan.recalibration_rolled_back', 'user', jsonb_build_object(
    'revision_id', v_revision.id, 'plan_id', v_revision.plan_id,
    'active_version_id', v_revision.from_version_id
  ));
  insert into private.account_mutation_keys(user_id, action, idempotency_key, request_sha256, response_payload)
  values (p_user_id, 'rollback-plan-recalibration', p_idempotency_key, p_request_sha256, v_response);
  return v_response;
end;
$$;

revoke all on function public.create_plan_recalibration_preview(
  uuid, uuid, uuid, jsonb, text, jsonb, jsonb, jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_plan_recalibration_preview(
  uuid, uuid, uuid, jsonb, text, jsonb, jsonb, jsonb, text, text, text
) to service_role;
revoke all on function public.confirm_plan_recalibration(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.confirm_plan_recalibration(uuid, uuid, text, text)
to service_role;
revoke all on function public.rollback_plan_recalibration(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.rollback_plan_recalibration(uuid, uuid, text, text)
to service_role;

commit;
