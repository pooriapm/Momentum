create table public.ai_safety_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  surface text not null check (surface in ('coach', 'plan', 'body_extraction')),
  reference_id uuid not null,
  reason_code text not null check (reason_code in (
    'unsafe_or_inappropriate', 'medical_advice', 'eating_disorder', 'unsafe_exercise',
    'body_shame', 'self_harm', 'privacy', 'incorrect_output', 'other'
  )),
  details text check (details is null or char_length(details) <= 1000),
  severity text not null default 'untriaged' check (severity in ('untriaged', 'p0', 'p1', 'p2')),
  status text not null default 'submitted' check (status in ('submitted', 'triaged', 'resolved', 'dismissed')),
  created_at timestamptz not null default statement_timestamp(),
  triaged_at timestamptz,
  resolved_at timestamptz
);

create index ai_safety_reports_user_created_idx on public.ai_safety_reports(user_id, created_at desc);
create index ai_safety_reports_triage_idx on public.ai_safety_reports(status, severity, created_at)
where status in ('submitted', 'triaged');

alter table public.ai_safety_reports enable row level security;
revoke all on public.ai_safety_reports from public, anon, authenticated;
grant select on public.ai_safety_reports to authenticated;
create policy ai_safety_reports_select_own on public.ai_safety_reports for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.submit_ai_safety_report(
  p_surface text,
  p_reference_id uuid,
  p_reason_code text,
  p_details text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_report public.ai_safety_reports%rowtype;
  v_owned boolean := false;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_surface not in ('coach', 'plan', 'body_extraction') then raise exception 'invalid_report_surface'; end if;
  if p_reason_code not in (
    'unsafe_or_inappropriate', 'medical_advice', 'eating_disorder', 'unsafe_exercise',
    'body_shame', 'self_harm', 'privacy', 'incorrect_output', 'other'
  ) then raise exception 'invalid_report_reason'; end if;
  if p_details is not null and char_length(p_details) > 1000 then raise exception 'report_details_too_long'; end if;

  if p_surface = 'coach' then
    select exists(select 1 from public.coach_messages where id = p_reference_id and user_id = v_user_id) into v_owned;
  elsif p_surface = 'plan' then
    select exists(select 1 from public.plan_versions where id = p_reference_id and user_id = v_user_id) into v_owned;
  else
    select exists(select 1 from public.body_composition_measurements where id = p_reference_id and user_id = v_user_id) into v_owned;
  end if;
  if not v_owned then raise exception 'report_reference_not_found'; end if;

  insert into public.ai_safety_reports(user_id, surface, reference_id, reason_code, details)
  values (v_user_id, p_surface, p_reference_id, p_reason_code, nullif(trim(p_details), ''))
  returning * into v_report;
  return jsonb_build_object(
    'id', v_report.id, 'surface', v_report.surface, 'reference_id', v_report.reference_id,
    'reason_code', v_report.reason_code, 'status', v_report.status, 'created_at', v_report.created_at
  );
end;
$$;

revoke all on function public.submit_ai_safety_report(text, uuid, text, text) from public, anon;
grant execute on function public.submit_ai_safety_report(text, uuid, text, text) to authenticated;
