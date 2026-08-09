-- Authoritative workout execution log. Clients may read their own rows, but all
-- mutations go through the validated RPCs below.

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  local_date date not null,
  plan_version_id uuid not null,
  workout_key text not null check (workout_key ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'),
  workout_title text not null check (char_length(workout_title) between 1 and 160),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'stopped')),
  started_at timestamptz not null default statement_timestamp(),
  ended_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  pain_reported boolean not null default false,
  pain_area text check (pain_area is null or char_length(pain_area) <= 160),
  pain_severity smallint check (pain_severity is null or pain_severity between 1 and 5),
  stop_reason text check (stop_reason is null or char_length(stop_reason) <= 1000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint workout_session_version_owned foreign key (plan_version_id, user_id)
    references public.plan_versions(id, user_id),
  constraint workout_session_id_owned unique (id, user_id),
  constraint workout_session_day_unique unique (user_id, local_date, workout_key),
  constraint workout_session_end_consistency check (
    (status = 'in_progress' and ended_at is null) or
    (status <> 'in_progress' and ended_at is not null)
  )
);

create table public.workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  session_id uuid not null,
  exercise_key text not null check (exercise_key ~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'),
  position smallint not null check (position between 0 and 99),
  planned_name text not null check (char_length(planned_name) between 1 and 160),
  planned_sets smallint not null check (planned_sets between 1 and 20),
  planned_reps text not null check (char_length(planned_reps) between 1 and 40),
  planned_rest_seconds smallint not null check (planned_rest_seconds between 0 and 3600),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  substitute_name text check (substitute_name is null or char_length(substitute_name) <= 160),
  skip_reason text check (skip_reason is null or char_length(skip_reason) <= 500),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint workout_exercise_session_owned foreign key (session_id, user_id)
    references public.workout_sessions(id, user_id) on delete cascade,
  constraint workout_exercise_key_unique unique (session_id, exercise_key),
  constraint workout_exercise_id_owned unique (id, user_id)
);

create table public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  exercise_log_id uuid not null,
  set_number smallint not null check (set_number between 1 and 20),
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  weight_kg numeric(7,2) check (weight_kg is null or weight_kg between 0 and 1000),
  reps smallint check (reps is null or reps between 0 and 1000),
  rpe numeric(3,1) check (rpe is null or rpe between 1 and 10),
  rest_seconds smallint check (rest_seconds is null or rest_seconds between 0 and 3600),
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint workout_set_exercise_owned foreign key (exercise_log_id, user_id)
    references public.workout_exercise_logs(id, user_id) on delete cascade,
  constraint workout_set_number_unique unique (exercise_log_id, set_number),
  constraint workout_set_complete_consistency check (
    (status = 'completed' and completed_at is not null) or
    (status <> 'completed' and completed_at is null)
  )
);

create index workout_sessions_user_date_idx on public.workout_sessions(user_id, local_date desc);
create index workout_exercises_session_idx on public.workout_exercise_logs(session_id, position);
create index workout_sets_exercise_idx on public.workout_set_logs(exercise_log_id, set_number);

create trigger workout_sessions_set_updated_at before update on public.workout_sessions
for each row execute function public.set_updated_at();
create trigger workout_exercises_set_updated_at before update on public.workout_exercise_logs
for each row execute function public.set_updated_at();
create trigger workout_sets_set_updated_at before update on public.workout_set_logs
for each row execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;
alter table public.workout_exercise_logs enable row level security;
alter table public.workout_set_logs enable row level security;

revoke all on public.workout_sessions, public.workout_exercise_logs, public.workout_set_logs
from public, anon, authenticated;
grant select on public.workout_sessions, public.workout_exercise_logs, public.workout_set_logs
to authenticated;

create policy workout_sessions_select_own on public.workout_sessions for select to authenticated
using ((select auth.uid()) = user_id);
create policy workout_exercises_select_own on public.workout_exercise_logs for select to authenticated
using ((select auth.uid()) = user_id);
create policy workout_sets_select_own on public.workout_set_logs for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function private.workout_session_snapshot(p_session_id uuid, p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'local_date', s.local_date, 'workout_key', s.workout_key,
    'workout_title', s.workout_title, 'status', s.status,
    'started_at', s.started_at, 'ended_at', s.ended_at, 'notes', s.notes,
    'pain_reported', s.pain_reported, 'pain_area', s.pain_area,
    'pain_severity', s.pain_severity, 'stop_reason', s.stop_reason,
    'exercises', coalesce((
      select jsonb_agg(to_jsonb(e) - 'user_id' - 'session_id' - 'created_at' - 'updated_at' ||
        jsonb_build_object('sets', coalesce((
          select jsonb_agg(to_jsonb(st) - 'user_id' - 'exercise_log_id' - 'created_at' - 'updated_at'
            order by st.set_number)
          from public.workout_set_logs st where st.exercise_log_id = e.id
        ), '[]'::jsonb)) order by e.position)
      from public.workout_exercise_logs e where e.session_id = s.id
    ), '[]'::jsonb)
  ) from public.workout_sessions s where s.id = p_session_id and s.user_id = p_user_id;
$$;

revoke all on function private.workout_session_snapshot(uuid, uuid) from public, anon, authenticated;

create or replace function public.start_workout_session(p_local_date date, p_workout_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_plan public.plans%rowtype;
  v_version public.plan_versions%rowtype;
  v_day jsonb;
  v_workout jsonb;
  v_session public.workout_sessions%rowtype;
  v_exercise jsonb;
  v_exercise_id uuid;
  v_position integer;
  v_sets integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_workout_key is null or p_workout_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$' then
    raise exception 'invalid_workout_key';
  end if;
  select timezone into v_timezone from public.profiles where user_id = v_user_id;
  begin v_today := (statement_timestamp() at time zone v_timezone)::date;
  exception when others then raise exception 'invalid_profile_timezone'; end;
  if p_local_date <> v_today then raise exception 'workout_date_not_current'; end if;

  select * into v_plan from public.plans
  where user_id = v_user_id and status = 'active' and p_local_date between valid_from and valid_to
  order by created_at desc limit 1;
  if not found or p_workout_key <> v_plan.id::text || '-' || (p_local_date - v_plan.valid_from)::text then
    raise exception 'active_workout_not_found';
  end if;
  select * into v_version from public.plan_versions
  where id = v_plan.active_version_id and user_id = v_user_id;
  select item into v_day
  from jsonb_array_elements(v_version.content->'days') as day(item)
  where (item->>'day_index')::integer = p_local_date - v_plan.valid_from
  limit 1;
  v_workout := v_day->'workout';
  if v_workout is null or jsonb_typeof(v_workout) <> 'object'
    or jsonb_typeof(v_workout->'exercises') <> 'array'
    or jsonb_array_length(v_workout->'exercises') = 0
  then raise exception 'active_workout_not_found'; end if;

  insert into public.workout_sessions(user_id, local_date, plan_version_id, workout_key, workout_title)
  values (v_user_id, p_local_date, v_version.id, p_workout_key, left(v_workout->>'title', 160))
  on conflict (user_id, local_date, workout_key) do nothing;
  select * into v_session from public.workout_sessions
  where user_id = v_user_id and local_date = p_local_date and workout_key = p_workout_key;

  if not exists (select 1 from public.workout_exercise_logs where session_id = v_session.id) then
    for v_exercise, v_position in
      select value, (ordinality - 1)::integer from jsonb_array_elements(v_workout->'exercises') with ordinality
    loop
      v_sets := greatest(1, least(20, (v_exercise->>'sets')::integer));
      insert into public.workout_exercise_logs(
        user_id, session_id, exercise_key, position, planned_name, planned_sets, planned_reps, planned_rest_seconds
      ) values (
        v_user_id, v_session.id, left(v_exercise->>'exercise_key', 120), v_position,
        left(v_exercise->>'name', 160), v_sets, left(v_exercise->>'reps', 40),
        greatest(0, least(3600, (v_exercise->>'rest_seconds')::integer))
      ) returning id into v_exercise_id;
      insert into public.workout_set_logs(user_id, exercise_log_id, set_number)
      select v_user_id, v_exercise_id, generate_series(1, v_sets);
    end loop;
  end if;
  return private.workout_session_snapshot(v_session.id, v_user_id);
end;
$$;

create or replace function public.mutate_workout_session(
  p_session_id uuid, p_action text, p_exercise_key text default null,
  p_set_number integer default null, p_values jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
  v_exercise public.workout_exercise_logs%rowtype;
  v_complete boolean;
  v_severity integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  select * into v_session from public.workout_sessions
  where id = p_session_id and user_id = v_user_id for update;
  if not found then raise exception 'workout_session_not_found'; end if;
  if v_session.status <> 'in_progress' then raise exception 'workout_session_closed'; end if;

  if p_exercise_key is not null then
    select * into v_exercise from public.workout_exercise_logs
    where session_id = p_session_id and user_id = v_user_id and exercise_key = p_exercise_key for update;
    if not found then raise exception 'workout_exercise_not_found'; end if;
  end if;
  if p_action in ('update_set', 'complete_exercise', 'skip_exercise', 'substitute_exercise', 'exercise_notes')
    and v_exercise.id is null
  then raise exception 'workout_exercise_not_found'; end if;

  case p_action
    when 'update_set' then
      if p_set_number is null or p_set_number not between 1 and v_exercise.planned_sets then
        raise exception 'invalid_set_number';
      end if;
      v_complete := coalesce((p_values->>'completed')::boolean, false);
      update public.workout_set_logs set
        status = case when v_complete then 'completed' else 'planned' end,
        weight_kg = nullif(p_values->>'weight_kg', '')::numeric,
        reps = nullif(p_values->>'reps', '')::integer,
        rpe = nullif(p_values->>'rpe', '')::numeric,
        rest_seconds = nullif(p_values->>'rest_seconds', '')::integer,
        completed_at = case when v_complete then statement_timestamp() else null end
      where exercise_log_id = v_exercise.id and set_number = p_set_number;
      update public.workout_exercise_logs set status = case
        when not v_complete and status = 'completed' then 'in_progress'
        when v_complete and status = 'planned' then 'in_progress'
        else status end
      where id = v_exercise.id;
    when 'complete_exercise' then
      if not exists (select 1 from public.workout_set_logs where exercise_log_id = v_exercise.id and status = 'completed') then
        raise exception 'exercise_has_no_completed_sets';
      end if;
      update public.workout_exercise_logs set status = 'completed' where id = v_exercise.id;
    when 'skip_exercise' then
      if char_length(trim(coalesce(p_values->>'reason', ''))) not between 1 and 500 then
        raise exception 'skip_reason_required';
      end if;
      update public.workout_exercise_logs set status = 'skipped', skip_reason = trim(p_values->>'reason') where id = v_exercise.id;
      update public.workout_set_logs set status = 'skipped', completed_at = null where exercise_log_id = v_exercise.id and status = 'planned';
    when 'substitute_exercise' then
      if char_length(trim(coalesce(p_values->>'name', ''))) not between 1 and 160 then
        raise exception 'substitute_name_required';
      end if;
      update public.workout_exercise_logs set substitute_name = trim(p_values->>'name'), status = 'in_progress' where id = v_exercise.id;
    when 'exercise_notes' then
      if char_length(coalesce(p_values->>'notes', '')) > 1000 then raise exception 'notes_too_long'; end if;
      update public.workout_exercise_logs set notes = nullif(trim(p_values->>'notes'), '') where id = v_exercise.id;
    when 'session_notes' then
      if char_length(coalesce(p_values->>'notes', '')) > 2000 then raise exception 'notes_too_long'; end if;
      update public.workout_sessions set notes = nullif(trim(p_values->>'notes'), '') where id = p_session_id;
    when 'report_pain' then
      v_severity := (p_values->>'severity')::integer;
      if v_severity is null or v_severity not between 1 and 5
        or char_length(trim(coalesce(p_values->>'area', ''))) not between 1 and 160
      then
        raise exception 'invalid_pain_report';
      end if;
      update public.workout_sessions set pain_reported = true, pain_area = trim(p_values->>'area'), pain_severity = v_severity,
        status = case when v_severity >= 4 then 'stopped' else status end,
        ended_at = case when v_severity >= 4 then statement_timestamp() else ended_at end,
        stop_reason = case when v_severity >= 4 then 'pain_reported' else stop_reason end
      where id = p_session_id;
    when 'stop' then
      if char_length(trim(coalesce(p_values->>'reason', ''))) not between 1 and 1000 then raise exception 'stop_reason_required'; end if;
      update public.workout_sessions set status = 'stopped', ended_at = statement_timestamp(), stop_reason = trim(p_values->>'reason')
      where id = p_session_id;
    when 'finish' then
      if exists (select 1 from public.workout_exercise_logs where session_id = p_session_id and status not in ('completed', 'skipped')) then
        raise exception 'unfinished_exercises';
      end if;
      update public.workout_sessions set status = 'completed', ended_at = statement_timestamp() where id = p_session_id;
    else raise exception 'unsupported_workout_action';
  end case;
  return private.workout_session_snapshot(p_session_id, v_user_id);
exception
  when check_violation or numeric_value_out_of_range or invalid_text_representation then
    raise exception 'invalid_workout_values';
end;
$$;

revoke all on function public.start_workout_session(date, text) from public, anon;
revoke all on function public.mutate_workout_session(uuid, text, text, integer, jsonb) from public, anon;
grant execute on function public.start_workout_session(date, text) to authenticated;
grant execute on function public.mutate_workout_session(uuid, text, text, integer, jsonb) to authenticated;
