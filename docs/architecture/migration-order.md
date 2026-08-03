# Migration order from local-only Momentum

## 1. Backend contract and launch guardrails

- Apply the Supabase migration and seed to a non-production project.
- Test all RLS policies with two users and anonymous access.
- Configure exact auth redirect URLs, consent copy, age policy and retention.
- Treat preview pricing as non-authoritative until margin and payment review.

## 2. Authentication and remote repositories

- Add sign-up/sign-in/session recovery before exposing existing feature screens.
- Replace `AppStateContext` mutations with async repository/query interfaces.
- Persist onboarding progress in `onboarding_drafts`; complete it only through
  the service RPC, which validates email/18+/risk/consent versions and deletes
  the draft transactionally.
- Keep only theme, locale and authentication session on the device.

## 3. One-time legacy import

For an authenticated user with legacy `momentum.appState` keys:

1. parse and validate without modifying the old value;
2. show an explicit migration/health-data consent preview;
3. upload through a server endpoint using a content hash and idempotency key;
4. insert profile, plans and logs in one transaction;
5. compare counts/digest returned by the server;
6. offer a final local JSON export;
7. remove all legacy primary, staging, recovery and quarantine values only after
   verification succeeds.

Never silently overwrite an authenticated profile with the `profile` embedded
in an imported or model-generated plan.

## 4. Read cutover

- Load profile, active plan and current-day log from PostgreSQL.
- Configure PWA service worker rules so Supabase/API responses are network-only.
- Force-update old service-worker clients before enabling remote writes.
- Verify cross-device selection and check-in conflict behavior.

## 5. AI cutover

- Configure trusted billing-country verification and current consent versions.
- Keep all AI switches off, then enable master/body/plan/coach individually for
  an internal eligible-country cohort.
- Run schema, nutrition, allergy, regional-food and urgent-safety evals.
- Enable `coach` only after safety review and monitoring are live.
- Compare actual provider usage with seeded allowance and pricing assumptions.
- Exercise the global request circuit breaker and emergency master kill switch.

## 6. Redesign, bilingual and native readiness

- Redesign against authenticated loading/error/empty/quota states, not the old
  synchronous local blob.
- Move all copy to fa/en resources and derive document direction from locale.
- Keep API contracts platform-neutral; isolate DOM/PWA/download code from shared
  domain calculations so Expo can consume the same API later.

## 7. Public release gate

- Database reset, lint, function type checks and end-to-end tests pass.
- Account export/deletion and Storage cleanup are verified.
- RLS cross-user tests pass in CI.
- Secrets rotation, backups/PITR, alerting, quotas and incident response are ready.
- Privacy policy, terms, health disclaimer and 18+ decision are published.
