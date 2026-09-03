# R1 environment and security operations

This is the tracked release contract for Momentum identity, API, data and secret
boundaries. It contains identifiers and secret names only, never secret values.

## Environment identity

| Environment | Identity | State | Permitted use |
| --- | --- | --- | --- |
| Local | Supabase project ID `momentum`; `127.0.0.1:54321` | Available | Clean reset, auth-email, RLS, Storage and Edge proofs |
| Staging | No project or branch provisioned | Blocked | Must exist before a hosted R1 acceptance run |
| Production | Project ref `osyvvzglvyonevkhdzpu`; web origin `https://momentum.pooria-pm.workers.dev` | Active | Owner-authorized R1 deployment; AI and payments remain fail-closed |

Do not reuse the unrelated `english-vocabulary` or `termledger` Supabase
projects. Do not call production "staging" and do not create a paid project or
branch without owner approval. `supabase/environments.json` is the
machine-readable copy of this contract.

## Release surface

The only target Edge Functions are `geo-context`, `account-data`,
`account-settings`, `checkins`, and `generate-monthly-plan`. The remote legacy
functions `generate-plan`, `coach`, and `analyze-body-composition` are
quarantined: clients have no route or invocation for them. Delete them only in
an explicitly approved production change after a staging smoke test and an
export of their remote metadata; deletion is not an automatic cleanup step.

Browser CORS is an exact allowlist. Production must set `ALLOWED_ORIGINS` to
`https://momentum.pooria-pm.workers.dev` (plus another exact HTTPS origin only
when that origin is intentionally deployed). Subdomain lookalikes and wildcard
origins are forbidden. Native clients normally omit `Origin`.

## Fail-closed switches

Keep these values until their separately reviewed feature releases:

```text
AI_MASTER_ENABLED=false
AI_PLAN_ENABLED=false
AI_PLAN_PROVIDER=stub
AI_PLAN_LIVE_OPENAI=false
AI_COACH_ENABLED=false
AI_BODY_COMPOSITION_ENABLED=false
```

The first emergency action for an AI incident is `AI_MASTER_ENABLED=false`.
The provider remains hard-disabled in code even if a configuration value is
changed accidentally. Restore a feature only after its safety evaluation,
country/consent gates, rate limits, and rollback have passed in staging.

## Secret ownership and rotation

| Secret/configuration | Owner | Rotate when | Safe procedure |
| --- | --- | --- | --- |
| Supabase server/API keys | Project owner | Suspected disclosure, staff/device loss, scheduled review | Rotate in Supabase, update server-only consumers, smoke-test, then revoke the old key |
| `OPENAI_API_KEY` | Project owner | Suspected disclosure, provider policy, scheduled review | Keep AI master off, issue scoped replacement, update Supabase secret, test staging, revoke old key |
| `OPENAI_SAFETY_PEPPER` | Security owner | Suspected disclosure or planned cryptographic rotation | Plan data compatibility first; rotate in staging, validate hashes/limits, then promote |
| `ALLOWED_ORIGINS` | Release owner | Web origin changes | Set exact origins, prove accepted and lookalike origins, then deploy functions |
| `CURRENT_*_VERSION` | Product/legal owner | Terms, privacy or health-consent revision | Publish documents first, update version values, and prove re-consent behavior |
| `IPINFO_TOKEN` | Project owner | Suspected disclosure or provider rotation | Replace server-side and verify `geo-context`; no client exposure |

Never copy secret values into Git, issues, logs, screenshots, Graphify, or this
document. The repository secret scan and frontend `VITE_` checks are mandatory.

## Promotion and rollback

1. Provision an isolated staging project/branch and record it in
   `environments.json` (owner approval is required if it can incur cost).
2. Reset/apply migrations and deploy exactly the five target functions.
3. Configure confirmed-email templates/redirects, exact CORS, current consent
   versions and fail-closed AI switches.
4. Run database, REST/RPC/Storage, full auth lifecycle, Edge, frontend, build,
   and browser smoke checks against staging. Confirm logs contain request IDs
   but no authorization, prompt, email or health payloads.
5. Review the migration diff and grants, back up production, then promote the
   same artifacts to project `osyvvzglvyonevkhdzpu`.
6. Smoke-test signup/verification/sign-in/recovery/sign-out/deletion and the
   five functions. Keep AI off.

Hosted Auth abuse, rate-limit, verification, recovery and session-revocation
proof:

```bash
npm run test:auth-hosted
```

That command targets project `osyvvzglvyonevkhdzpu` only. It uses
`generateLink` so SMTP bodies never enter Git or logs, then deletes the
disposable users. It does **not** burst production IP rate limits; the
`sign_in_sign_ups` burst is `npm run test:auth-abuse` against local
Supabase. The CLI's Auth container does not set `GOTRUE_RATE_LIMIT_HEADER`,
so this proof starts a disposable Auth container with the same local configuration
and an IP header, bound only to loopback. It exhausts the initial 30-request
bucket, requires `over_request_rate_limit`, and confirms another IP can still
sign up. The fixture and its users are removed afterward; the normal Auth
container is unchanged. CI skips the hosted proof unless `MOMENTUM_HOSTED_AUTH_PROOF=1`.

Export/deletion across Auth, database, Storage, and provider metadata:

```bash
npm run test:privacy-lifecycle
```

That local drill is the R-306 executable proof. Hosted production remains
opt-in (`npm run test:privacy-hosted`) and still lacks staging. Do not deploy
the matching Edge Function until `purge_account_owned_rows` is applied on the
target database.

Private body-report upload/download/delete and 30-day unconfirmed retention:

```bash
npm run test:body-report
```

Rollback functions to the previously recorded deployment first. For database
changes, prefer a reviewed forward repair; never reset or destructively rewind
production. Disable the affected function/feature, preserve audit evidence, and
restore service only after ownership and data boundaries are re-proven.

Backup/PITR, restore drills, monitoring, alerts, on-call and bilingual support
are tracked in `R7-OPERATIONS.md` and executed with `npm run test:ops`.

## R1 acceptance status

R1 engineering and production deployment completed on 2026-08-24. Local
acceptance remains executable through `npm run test:r1-local`; the final GitHub
quality run passed all five jobs. Production contains all target migrations and
the five target Edge Functions. Exact-origin CORS, public geo access, missing and
invalid token behavior, request IDs, service-role least privilege, Auth URL/MFA,
Storage configuration and fail-closed AI switches were verified.

No isolated staging project or branch exists. The owner explicitly authorized a
constrained direct-production deployment because provisioning another hosted
environment was not available. This is an exception, not evidence that staging
exists: destructive lifecycle drills, restore rehearsal and promotion/rollback
practice remain blocked until an isolated environment is available. R2 work may
continue locally and in CI, but it must not weaken the production safety switches.
