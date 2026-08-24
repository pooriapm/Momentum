begin;

alter table public.plan_versions drop constraint if exists plan_versions_source_check;
alter table public.plan_versions
  add constraint plan_versions_source_check
  check (source in ('openai', 'legacy_import', 'external_import', 'deterministic', 'admin'));

create table public.starter_plan_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  plan_id uuid not null,
  plan_version_id uuid not null,
  template_version text not null check (char_length(template_version) between 1 and 80),
  schema_version text not null check (schema_version ~ '^1\.[0-9]+\.[0-9]+$'),
  catalog_release text not null references public.catalog_releases(id),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  activated_at timestamptz not null default statement_timestamp(),
  constraint starter_plan_activations_user_template_unique unique (user_id, template_version),
  constraint starter_plan_activations_plan_owned
    foreign key (plan_id, user_id) references public.plans(id, user_id) on delete cascade,
  constraint starter_plan_activations_version_owned
    foreign key (plan_version_id, user_id) references public.plan_versions(id, user_id) on delete cascade
);

create index starter_plan_activations_user_date_idx
on public.starter_plan_activations(user_id, activated_at desc);

alter table public.starter_plan_activations enable row level security;
create policy starter_plan_activations_select_own on public.starter_plan_activations
  for select to authenticated using (user_id = auth.uid());
revoke all on public.starter_plan_activations from public, anon, authenticated;
grant select on public.starter_plan_activations to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.starter_plan_activations from service_role;
grant select on public.starter_plan_activations to service_role;

create or replace function public.persist_deterministic_starter_plan(
  p_user_id uuid,
  p_idempotency_key text,
  p_goal_id uuid,
  p_plan_name text,
  p_valid_from date,
  p_valid_to date,
  p_locale text,
  p_schema_version text,
  p_catalog_release text,
  p_template_version text,
  p_terms_version text,
  p_privacy_version text,
  p_health_consent_version text,
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
  v_prior public.starter_plan_activations%rowtype;
  v_profile public.profiles%rowtype;
  v_plan_id uuid;
  v_version_id uuid;
  v_activation_id uuid;
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
    or char_length(p_template_version) not between 1 and 80
    or char_length(p_terms_version) not between 1 and 80
    or char_length(p_privacy_version) not between 1 and 80
    or char_length(p_health_consent_version) not between 1 and 80
    or jsonb_typeof(p_content) <> 'object'
    or p_content_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_starter_plan' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'create-starter-plan'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_content_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload || jsonb_build_object('idempotent_replay', true);
  end if;

  select * into v_profile from public.profiles where user_id = p_user_id for update;
  if v_profile.user_id is null
    or v_profile.onboarding_status <> 'complete'
    or v_profile.automation_block_reason is not null
    or v_profile.plan_source_preference <> 'momentum'
    or v_profile.date_of_birth is null
    or date_part('year', age(current_date, v_profile.date_of_birth))::integer not between 18 and 100
    or v_profile.country_code !~ '^[A-Z]{2}$'
    or (v_profile.country_code = 'IR' and v_profile.product_region <> 'ir')
    or (v_profile.country_code <> 'IR' and v_profile.product_region <> 'intl')
    or v_profile.terms_accepted_at is null
    or v_profile.terms_version is distinct from p_terms_version
    or v_profile.privacy_accepted_at is null
    or v_profile.privacy_version is distinct from p_privacy_version
    or v_profile.health_data_consent_at is null
    or v_profile.health_consent_version is distinct from p_health_consent_version
  then
    raise exception 'starter_plan_gate_failed' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.goals
    where id = p_goal_id and user_id = p_user_id and status = 'active'
  ) or not exists (
    select 1 from public.catalog_releases
    where id = p_catalog_release and status = 'active'
  ) then
    raise exception 'starter_plan_gate_failed' using errcode = 'P0001';
  end if;

  select * into v_prior
  from public.starter_plan_activations
  where user_id = p_user_id and template_version = p_template_version;
  if v_prior.id is not null then
    return jsonb_build_object(
      'activation_id', v_prior.id,
      'plan_id', v_prior.plan_id,
      'plan_version_id', v_prior.plan_version_id,
      'activated_at', v_prior.activated_at,
      'idempotent_replay', true
    );
  end if;

  insert into public.plans(user_id, goal_id, name, status, valid_from, valid_to, locale)
  values (p_user_id, p_goal_id, trim(p_plan_name), 'draft', p_valid_from, p_valid_to, p_locale)
  returning id into v_plan_id;

  insert into public.plan_versions(
    plan_id, user_id, version, schema_version, source, prompt_version, model, content, content_sha256
  ) values (
    v_plan_id, p_user_id, 1, p_schema_version, 'deterministic',
    p_template_version, null, p_content, p_content_sha256
  ) returning id into v_version_id;

  update public.plans
  set status = 'archived'
  where user_id = p_user_id and id <> v_plan_id and status = 'active'
    and daterange(valid_from, valid_to, '[]') && daterange(p_valid_from, p_valid_to, '[]');

  update public.plans
  set active_version_id = v_version_id, status = 'active'
  where id = v_plan_id and user_id = p_user_id;

  insert into public.starter_plan_activations(
    user_id, plan_id, plan_version_id, template_version, schema_version,
    catalog_release, content_sha256
  ) values (
    p_user_id, v_plan_id, v_version_id, p_template_version, p_schema_version,
    p_catalog_release, p_content_sha256
  ) returning id into v_activation_id;

  v_response := jsonb_build_object(
    'activation_id', v_activation_id,
    'plan_id', v_plan_id,
    'plan_version_id', v_version_id,
    'activated_at', v_now
  );

  insert into private.account_mutation_keys(
    user_id, action, idempotency_key, request_sha256, response_payload
  ) values (
    p_user_id, 'create-starter-plan', p_idempotency_key, p_content_sha256, v_response
  );

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'plan.deterministic_starter_activated',
    'service',
    jsonb_build_object(
      'plan_id', v_plan_id,
      'plan_version_id', v_version_id,
      'template_version', p_template_version,
      'catalog_release', p_catalog_release
    )
  );

  return v_response;
end;
$$;

revoke all on function public.persist_deterministic_starter_plan(
  uuid, text, uuid, text, date, date, text, text, text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.persist_deterministic_starter_plan(
  uuid, text, uuid, text, date, date, text, text, text, text, text, text, text, jsonb, text
) to service_role;

commit;
