-- R2.5: account-data persists the optional next-cycle note without browser
-- storage. The Edge service may write only this owner-bound input table in
-- addition to the existing generation lifecycle allowlist.

grant insert, update on table public.next_cycle_inputs to service_role;

comment on table public.next_cycle_inputs is
  'Owner-bound next-cycle input; authenticated access uses RLS and account-data may persist the optional network-only note.';
