begin;

-- R3 closes the monthly lifecycle while both payments and live AI remain stubs.

-- The stub payment record is server-owned and deliberately cannot contain card
-- data. `pending` and `not_collected` both fail closed for paid generation.
alter table public.profiles
  drop constraint if exists profiles_payment_method_status_check;
alter table public.profiles
  add constraint profiles_payment_method_status_check
  check (payment_method_status in ('not_collected', 'pending', 'stub_recorded'));

-- Preserve the product-level states instead of collapsing recovery and terminal
-- membership states into `expired` in storage.
alter table public.entitlements
  drop constraint if exists entitlements_status_check;
alter table public.entitlements
  add constraint entitlements_status_check
  check (status in (
    'active',
    'grace',
    'payment_pending',
    'cancelled',
    'expired',
    'revoked'
  ));

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
    where p.user_id = p_user_id
      and p.payment_method_status <> 'stub_recorded'
      and not exists (
        select 1
        from public.entitlements e
        where e.user_id = p.user_id
          and e.source = 'gift'
          and e.status = 'active'
          and statement_timestamp() >= e.period_start
          and statement_timestamp() < e.period_end
      )
  );
$$;

revoke all on function private.payment_method_blocks_paid_generation(uuid)
from public, anon, authenticated;

-- A monthly period is the durable idempotency boundary. Different HTTP keys
-- cannot create another job, and a job cannot import a second immutable version.
create unique index if not exists ai_generation_jobs_one_per_period
on public.ai_generation_jobs(period_id)
where period_id is not null;

create unique index if not exists plan_versions_one_per_generation_job
on public.plan_versions(generation_job_id)
where generation_job_id is not null;

create unique index if not exists monthly_periods_one_imported_version
on public.monthly_plan_periods(imported_plan_version_id)
where imported_plan_version_id is not null;

-- Reservation time is not cycle time. Once import succeeds, align the gifted
-- entitlement with ready_at and the user's calendar-month boundary.
create or replace function private.align_gift_entitlement_to_ready_cycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'ready'
    and new.ready_at is not null
    and new.ends_at is not null
    and (old.status is distinct from new.status or old.ready_at is distinct from new.ready_at)
  then
    update public.entitlements
    set period_start = new.ready_at, period_end = new.ends_at
    where id = new.entitlement_id
      and user_id = new.user_id
      and source = 'gift';
  end if;
  return new;
end;
$$;

revoke all on function private.align_gift_entitlement_to_ready_cycle()
from public, anon, authenticated;

drop trigger if exists monthly_periods_align_gift_entitlement
on public.monthly_plan_periods;
create trigger monthly_periods_align_gift_entitlement
after update of status, ready_at, ends_at on public.monthly_plan_periods
for each row execute function private.align_gift_entitlement_to_ready_cycle();

-- Reconciliation releases only stale reservations, marks the original job and
-- period failed, and never touches a previously imported/active plan.
create or replace function public.reconcile_stale_generation_jobs(
  p_max_age_seconds integer default 600
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  v_count integer;
begin
  if p_max_age_seconds not between 480 and 86400 then
    raise exception 'invalid_reconciliation_arguments' using errcode = '22023';
  end if;
  with stale as (
    update public.usage_ledger
    set status = 'released', finalized_at = statement_timestamp()
    where status = 'reserved'
      and created_at < statement_timestamp() - make_interval(secs => p_max_age_seconds)
    returning id
  ), failed_jobs as (
    update public.ai_generation_jobs
    set status = 'failed', error_code = 'reservation_expired', finished_at = statement_timestamp()
    where usage_ledger_id in (select id from stale)
      and status in ('queued', 'validating', 'importing', 'in_progress')
    returning id, period_id, user_id
  ), failed_periods as (
    update public.monthly_plan_periods p
    set status = 'failed_provider'
    from failed_jobs j
    where p.id = j.period_id
      and p.user_id = j.user_id
      and p.status <> 'ready'
    returning p.id
  )
  select count(*)::integer into v_count from stale;
  return v_count;
end;
$$;

revoke all on function public.reconcile_stale_generation_jobs(integer)
from public, anon, authenticated;
grant execute on function public.reconcile_stale_generation_jobs(integer)
to service_role;

commit;
