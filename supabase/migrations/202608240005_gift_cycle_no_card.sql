begin;

-- The first Momentum-managed plan is a true gift. Payment is required only
-- for paid entitlements after that gifted cycle, never to reserve/use the gift.
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
      and p.payment_method_status = 'not_collected'
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

commit;
