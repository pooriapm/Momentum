begin;

-- Admin panel for the website's manual payments. Every function here is
-- service_role only: the payments Edge Function checks ADMIN_USER_IDS first
-- and passes the admin's id, which is written to the audit log.
-- Admins see accounts, memberships and payments; never health data.

-- Rejecting a receipt now says why, so the member knows what to fix.
-- failure_code is card_<reason>; a review without a reason stays card_rejected.
drop function if exists public.review_card_payment(uuid, boolean, uuid);
create or replace function public.review_card_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_reviewer uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_result jsonb;
begin
  if p_reason is not null
    and p_reason not in ('amount_mismatch', 'not_received', 'unreadable', 'duplicate')
  then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null or v_payment.provider <> 'card_transfer' then
    raise exception 'payment_not_found' using errcode = 'P0001';
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'payment_not_pending' using errcode = 'P0001';
  end if;

  if p_approve then
    v_result := public.grant_paid_month(p_payment_id, 'card-review');
  else
    update public.payments
    set status = 'failed', failure_code = 'card_' || coalesce(p_reason, 'rejected')
    where id = p_payment_id;
    v_result := jsonb_build_object('payment_id', p_payment_id, 'rejected', true);
  end if;

  update public.payments
  set reviewed_at = statement_timestamp(), reviewed_by = p_reviewer
  where id = p_payment_id;

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    v_payment.user_id,
    case when p_approve then 'card_payment_approved' else 'card_payment_rejected' end,
    'admin',
    jsonb_strip_nulls(jsonb_build_object('admin_id', p_reviewer, 'payment_id', p_payment_id, 'reason', p_reason))
  );

  return v_result;
end;
$$;

-- Numbers for the overview: what needs attention and how membership is going.
create or replace function public.admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with live as (
    select user_id, source, max(period_end) as last_end
    from public.entitlements
    where status = 'active' and period_end > statement_timestamp()
    group by user_id, source
  ),
  members as (
    select user_id, max(last_end) as last_end
    from live
    where source in ('subscription', 'admin')
    group by user_id
  )
  select jsonb_build_object(
    'pending_receipts', (
      select count(*) from public.payments where provider = 'card_transfer' and status = 'pending'
    ),
    'paying_members', (select count(*) from members),
    'gift_members', (
      select count(*) from live g
      where g.source = 'gift' and not exists (select 1 from members m where m.user_id = g.user_id)
    ),
    'ending_within_5_days', (
      select count(*) from members where last_end <= statement_timestamp() + interval '5 days'
    ),
    'paid_last_30_days', (
      select count(*) from public.payments
      where status = 'paid' and paid_at > statement_timestamp() - interval '30 days'
    ),
    'revenue_last_30_days_irr', (
      select coalesce(sum(amount_minor), 0) from public.payments
      where status = 'paid' and currency = 'IRR' and paid_at > statement_timestamp() - interval '30 days'
    ),
    'accounts', (select count(*) from public.profiles),
    'waitlist', (select count(*) from public.profiles where membership_interest_at is not null)
  );
$$;

-- Reviewed card-transfer receipts, newest first.
create or replace function public.admin_card_history(p_limit integer default 50)
returns table (
  payment_id uuid,
  email text,
  amount_minor bigint,
  status text,
  failure_code text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_email text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    u.email::text,
    p.amount_minor::bigint,
    p.status,
    p.failure_code,
    p.created_at,
    p.reviewed_at,
    r.email::text
  from public.payments p
  left join auth.users u on u.id = p.user_id
  left join auth.users r on r.id = p.reviewed_by
  where p.provider = 'card_transfer' and p.status <> 'pending'
  order by coalesce(p.reviewed_at, p.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- Accounts whose email starts with the query, or the account with that id.
create or replace function public.admin_find_members(p_query text)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  country_code text,
  product_region text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
begin
  if length(v_query) < 3 or length(v_query) > 254 then
    raise exception 'invalid_query' using errcode = '22023';
  end if;
  return query
  select u.id, u.email::text, u.created_at, p.country_code, p.product_region
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where lower(u.email) like replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    or u.id::text = v_query
  order by u.email
  limit 20;
end;
$$;

-- One member's account, memberships and payments (no health data).
create or replace function public.admin_member_detail(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'country_code', p.country_code,
    'product_region', p.product_region,
    'onboarding_status', p.onboarding_status,
    'membership_interest_at', p.membership_interest_at,
    'entitlements', coalesce((
      select jsonb_agg(e order by e.period_start desc)
      from (
        select id, source, status, period_start, period_end
        from public.entitlements
        where user_id = u.id
        order by period_start desc
        limit 12
      ) e
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(x order by x.created_at desc)
      from (
        select id, provider, status, amount_minor, currency, failure_code, created_at, paid_at
        from public.payments
        where user_id = u.id
        order by created_at desc
        limit 12
      ) x
    ), '[]'::jsonb)
  )
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where u.id = p_user_id;
$$;

-- Adds days of membership by hand (a correction, a refund made good, a
-- goodwill gesture). Like a payment, it starts when the latest live period
-- ends, so it never overlaps one. Always audited with the admin and a note.
create or replace function public.admin_grant_days(
  p_user_id uuid,
  p_days integer,
  p_admin uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_note text := btrim(coalesce(p_note, ''));
  v_start timestamptz;
  v_entitlement_id uuid;
  v_period_end timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  if length(v_note) < 3 or length(v_note) > 200 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;
  if p_admin is null then
    raise exception 'admin_required' using errcode = '22023';
  end if;

  perform 1 from public.profiles where user_id = p_user_id for update;
  if not found then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;

  select greatest(statement_timestamp(), coalesce(max(period_end), statement_timestamp()))
  into v_start
  from public.entitlements
  where user_id = p_user_id
    and status = 'active'
    and period_end > statement_timestamp();

  insert into public.entitlements (
    user_id, source, status, period_start, period_end, plan_generation_limit
  )
  values (
    p_user_id, 'admin', 'active', v_start, v_start + make_interval(days => p_days), 1
  )
  returning id, period_end into v_entitlement_id, v_period_end;

  insert into private.account_audit_events(user_id, event_type, actor_type, metadata)
  values (
    p_user_id,
    'membership_days_granted',
    'admin',
    jsonb_build_object(
      'admin_id', p_admin,
      'entitlement_id', v_entitlement_id,
      'days', p_days,
      'note', v_note
    )
  );

  return jsonb_build_object(
    'entitlement_id', v_entitlement_id,
    'period_start', v_start,
    'period_end', v_period_end
  );
end;
$$;

-- Members outside Iran who asked to hear when membership opens for them.
create or replace function public.admin_membership_waitlist()
returns table (
  email text,
  country_code text,
  registered_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.email::text, p.country_code, p.membership_interest_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.membership_interest_at is not null
  order by p.membership_interest_at desc
  limit 1000;
$$;

revoke all on function public.review_card_payment(uuid, boolean, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_card_history(integer) from public, anon, authenticated;
revoke all on function public.admin_find_members(text) from public, anon, authenticated;
revoke all on function public.admin_member_detail(uuid) from public, anon, authenticated;
revoke all on function public.admin_grant_days(uuid, integer, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_membership_waitlist() from public, anon, authenticated;

grant execute on function public.review_card_payment(uuid, boolean, uuid, text) to service_role;
grant execute on function public.admin_overview() to service_role;
grant execute on function public.admin_card_history(integer) to service_role;
grant execute on function public.admin_find_members(text) to service_role;
grant execute on function public.admin_member_detail(uuid) to service_role;
grant execute on function public.admin_grant_days(uuid, integer, uuid, text) to service_role;
grant execute on function public.admin_membership_waitlist() to service_role;

commit;
