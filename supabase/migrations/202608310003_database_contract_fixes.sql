begin;

-- A missing payment method blocks only paid subscription cycles. The no-card
-- gift and administrator-granted entitlements remain usable, while merely
-- having an active subscription row must never bypass the payment gate.
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
      and p.payment_method_status in ('not_collected', 'pending')
      and exists (
        select 1
        from public.entitlements e
        where e.user_id = p.user_id
          and e.source = 'subscription'
          and e.status = 'active'
          and statement_timestamp() >= e.period_start
          and statement_timestamp() < e.period_end
      )
  );
$$;

revoke all on function private.payment_method_blocks_paid_generation(uuid)
from public, anon, authenticated;

-- Trigger functions receive PUBLIC EXECUTE by default unless explicitly
-- revoked. This trigger is internal and must not be callable by API roles.
revoke all on function private.clear_legacy_ai_country_gate()
from public, anon, authenticated;

commit;
