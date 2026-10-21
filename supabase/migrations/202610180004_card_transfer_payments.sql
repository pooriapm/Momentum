begin;

-- Card-to-card payment for Iranian website members, reviewed by hand.
-- The member transfers the IRR price to the card shown on the site, uploads the
-- bank receipt, and the payment waits as pending until an admin approves it
-- (grant_paid_month: one 30-day period) or rejects it. No gateway is involved.

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check
  check (provider in ('zarinpal', 'bazaar', 'card_transfer'));

alter table public.payments
  add column if not exists receipt_path text
    check (receipt_path is null or length(receipt_path) between 40 and 200),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

-- At most one receipt waits for review per member at a time.
create unique index if not exists payments_one_pending_card_per_user
on public.payments(user_id)
where provider = 'card_transfer' and status = 'pending';

-- Members outside Iran can ask to hear when membership opens for them.
alter table public.profiles
  add column if not exists membership_interest_at timestamptz;

-- Private receipt images. Members reach only their own folder; admins read
-- receipts through the payments Edge Function with signed URLs.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_receipts_select_own on storage.objects;
create policy payment_receipts_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists payment_receipts_insert_own on storage.objects;
create policy payment_receipts_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- A member may remove a receipt they uploaded (for example before submitting).
drop policy if exists payment_receipts_delete_own on storage.objects;
create policy payment_receipts_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Records a submitted card-transfer receipt as a pending payment for the
-- active IRR membership price.
create or replace function public.submit_card_payment(
  p_user_id uuid,
  p_receipt_path text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_price public.product_prices%rowtype;
  v_payment_id uuid;
begin
  if p_user_id is null
    or p_receipt_path is null
    or p_receipt_path !~ ('^' || p_user_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
  then
    raise exception 'invalid_receipt' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.payments
    where user_id = p_user_id and provider = 'card_transfer' and status = 'pending'
  ) then
    raise exception 'card_payment_pending' using errcode = 'P0001';
  end if;

  select * into v_price
  from public.product_prices
  where product_code = 'membership'
    and market = 'ir'
    and currency = 'IRR'
    and billing_interval = 'month'
    and active
  limit 1;

  if v_price.id is null then
    raise exception 'pricing_unavailable' using errcode = 'P0001';
  end if;

  insert into public.payments (
    user_id, provider, product_price_id, amount_minor, currency,
    provider_reference, receipt_path
  )
  values (
    p_user_id, 'card_transfer', v_price.id, v_price.amount_minor, 'IRR',
    'card:' || gen_random_uuid()::text, p_receipt_path
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

-- Approves (one 30-day period) or rejects a pending card-transfer payment.
-- The Edge Function checks that the reviewer is an admin before calling this.
create or replace function public.review_card_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_reviewer uuid
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
    set status = 'failed', failure_code = 'card_rejected'
    where id = p_payment_id;
    v_result := jsonb_build_object('payment_id', p_payment_id, 'rejected', true);
  end if;

  update public.payments
  set reviewed_at = statement_timestamp(), reviewed_by = p_reviewer
  where id = p_payment_id;

  return v_result;
end;
$$;

create or replace function public.register_membership_interest(p_user_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.profiles
  set membership_interest_at = coalesce(membership_interest_at, statement_timestamp())
  where user_id = p_user_id;
$$;

revoke all on function public.submit_card_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.review_card_payment(uuid, boolean, uuid) from public, anon, authenticated;
revoke all on function public.register_membership_interest(uuid) from public, anon, authenticated;
grant execute on function public.submit_card_payment(uuid, text) to service_role;
grant execute on function public.review_card_payment(uuid, boolean, uuid) to service_role;
grant execute on function public.register_membership_interest(uuid) to service_role;

commit;
