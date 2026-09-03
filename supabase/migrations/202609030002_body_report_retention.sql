-- Unconfirmed private body reports are short-retention media. Confirmed
-- structured measurements stay until account deletion. Service role cannot
-- delete Storage objects from SQL, so this RPC deletes expired measurement
-- rows and returns object paths for the Edge/ops worker to remove.

begin;

create or replace function public.purge_expired_body_reports()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  with expired as (
    delete from public.body_composition_measurements
    where extraction_status in ('pending', 'processing', 'needs_confirmation', 'failed')
      and report_object_path is not null
      and created_at < statement_timestamp() - interval '30 days'
    returning report_object_path
  )
  select jsonb_build_object(
    'deleted_rows', count(*)::integer,
    'paths', coalesce(jsonb_agg(report_object_path order by report_object_path), '[]'::jsonb),
    'retention_days', 30
  )
  into v_result
  from expired;

  return v_result;
end;
$$;

comment on function public.purge_expired_body_reports() is
  'Service-only retention job. Removes unconfirmed body-report rows older than 30 days and returns Storage paths. Confirmed measurements are retained until account deletion.';

revoke all on function public.purge_expired_body_reports()
from public, anon, authenticated;
grant execute on function public.purge_expired_body_reports() to service_role;

do $cron$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cron' and p.proname = 'schedule'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text, text, text'
  ) then
    begin
      perform cron.unschedule('purge-expired-body-reports');
    exception when others then null;
    end;
    perform cron.schedule(
      'purge-expired-body-reports',
      '23 3 * * *',
      $job$select public.purge_expired_body_reports()$job$
    );
  end if;
exception
  when undefined_function then null;
  when undefined_table then null;
end;
$cron$;

commit;
