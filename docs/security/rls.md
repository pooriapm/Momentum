# RLS and authorization matrix

RLS is the last database boundary, not a replacement for input validation. Edge
Functions verify the JWT with `auth.getUser()` and derive `user_id` from that
verified user. The service role is then used only with explicit user filters or
service-only RPCs.

| Resource | Anonymous | Authenticated owner | Direct write | Service write |
| --- | --- | --- | --- | --- |
| Active `product_prices` | read | read | no | yes |
| Profile/onboarding/goal/preferences/health | no | own rows | allowed columns only; protected profile state via service | yes |
| Body composition and private objects | no | own prefix/rows | upload/manual values and explicit confirmation only; no generative extraction state | yes |
| Plan metadata | no | own rows | no | yes |
| Raw plan versions | no | no; read through projection | no | yes |
| Check-ins/extra foods | no | own rows | own rows | yes |
| Meal status | no | own rows | no; select/complete through `account-data` | yes |
| AI jobs, usage, subscriptions, entitlements | no | own rows | no | yes |
| Monthly plan periods/snapshots | no | own rows | no | yes |
| Private rate limit/idempotency/audit tables | no | no | no | yes |

## Required tests

Run each scenario with user A, user B, anonymous and service-role sessions:

1. A can read/update A's profile but cannot read/update B's.
2. A cannot create a goal, check-in or measurement using B's `user_id`.
3. A cannot read B's plan version, AI job, monthly snapshot or usage ledger.
4. Anonymous can read only currently active catalog prices.
5. Authenticated clients cannot insert/update plans, entitlements, subscriptions,
   AI jobs, usage rows or monthly snapshots directly.
6. Storage accepts `body-composition/A/...` for A and rejects B's prefix.
7. A signed URL expires and does not make the bucket public.
8. `select_meal_option` rejects a slot/option not present in A's active immutable
   plan and rejects an idempotency key reused with different input.
9. `complete_meal_option` validates the same immutable option and preserves the
   first completion timestamp; changing a completed option is rejected.
10. `confirm_body_composition` accepts only normalized, range-valid values for A,
    records source metadata, and cannot create or authorize an AI extraction job.
11. Plan generation with two concurrent identical keys creates one usage
   reservation/job; distinct keys cannot exceed quota.
12. Reusing an AI key with a different request digest is rejected, and terminal
    failed/released keys cannot create unmetered retries.
13. Two overlapping active plans for one user are rejected by the exclusion
    constraint, while another user's range is independent.
14. Authenticated SQL cannot set `ai_billing_country_code`, verification time/
    method, onboarding status, consent versions, entitlement or AI kill state.
15. Dashboard dates are computed from the stored, validated profile timezone;
    meal RPCs reject any non-current profile-local date before resolving the
    option and still require that date to be inside the active plan range.

## Policy-change rules

- Every new user table must enable RLS in the same migration that creates it.
- Add an indexed owner predicate before shipping a policy using `user_id`.
- Do not create broad `authenticated USING (true)` policies.
- Do not expose service RPC execution to `anon` or `authenticated`.
- `SECURITY DEFINER` functions must pin `search_path`, validate all identifiers,
  and receive a user ID only from a verified server caller.
- CI must fail if an exposed table has RLS disabled or lacks the expected policy.
