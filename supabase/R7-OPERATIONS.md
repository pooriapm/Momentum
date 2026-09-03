# R7 operations contract

This is the tracked, public-safe operations contract for backup/PITR, restore
drills, monitoring, alerts, on-call, and bilingual support. It contains
identifiers, env *names*, and script paths. It never contains secret values,
health text, prompts, personal mailboxes, or phone numbers.

## Current posture

| Control | State |
| --- | --- |
| Production project | `osyvvzglvyonevkhdzpu` |
| Staging | Not provisioned; hosted restore is `blocked_no_staging` |
| Local restore drill | `scripts/ops/restore-drill.sh` |
| Backup/PITR live check | `scripts/ops/backup-pitr-status.mjs` (needs `SUPABASE_ACCESS_TOKEN`) |
| Monitoring | Worker routes `/ops/health` and `/ops/client-errors`; Cloudflare logs on |
| Support locales | `fa` and `en` in `ops/support-macros.json` |
| On-call contact | Owner-set `MOMENTUM_ONCALL_CONTACT`; never committed |

R1 still records that destructive hosted drills stay blocked until an isolated
environment exists. This file does not override that blocker.

## Hosted Auth proof

```bash
npm run test:auth-hosted
npm run test:auth-abuse
```

`test:auth-hosted` targets production Auth only. It checks that signup grants no
session, unverified sign-in is blocked, confirmation resend is rate-limited,
invalid OTP fails, verification and recovery succeed via `generateLink`, and
global sign-out revokes the refresh token. Disposable users are deleted.
SMTP bodies are never read. The IP burst for `sign_in_sign_ups` stays on local
Supabase so production user traffic is not locked out.

CI skips the hosted proof unless `MOMENTUM_HOSTED_AUTH_PROOF=1`.

## Export and deletion drill

```bash
npm run test:privacy-lifecycle
npm run test:privacy-hosted
```

The local drill creates two disposable users, seeds owner rows including
provider usage, uploads a nested private file, exports every owner table,
then deletes through `account-data`. It asserts Auth identity and refresh
tokens are gone, owner tables and Storage objects are empty, the neighbor
account is untouched, and an anonymized deletion receipt remains. OpenAI
calls stay `store: false`; live provider storage is not created.

`test:privacy-hosted` is opt-in against production. Staging is still missing,
so it uses disposable `@pooria-pm.workers.dev` users, never logs export
payloads, and skips provider-row seeding because service_role cannot insert
usage ledger rows. CI skips it unless `MOMENTUM_HOSTED_PRIVACY_PROOF=1`.
Apply `purge_account_owned_rows` to the hosted database before deploying the
matching Edge Function.

## Private body reports

```bash
npm run test:body-report
npm run test:body-report-hosted
```

The local drill uploads a private `body-composition/{user_id}/...` object,
downloads it as the owner, rejects neighbor/anonymous download, expires a
one-second signed URL, deletes the owner object and measurement row, then
runs `purge_expired_body_reports`. Unconfirmed reports older than 30 days
are removed; confirmed structured measurements are kept until account
deletion. CI skips the hosted Storage proof unless
`MOMENTUM_HOSTED_BODY_REPORT_PROOF=1`.

## Backup and PITR

- Provider: Supabase daily backups plus PITR, both required for production.
- Ordinary RPO: 24 hours. Paid-transaction RPO: 1 hour if checkout ships.
- RTO: 8 hours for early public beta. These are hypotheses, not provider SLAs.
- Never dump production into this repository, tickets, or CI logs.
- Live PITR status is verified only with `SUPABASE_ACCESS_TOKEN`. CI does not
  require that token and must report `liveVerification: skipped`.

## Restore drill

```bash
npm run ops:restore-drill
bash scripts/ops/restore-drill.sh execute
```

Default mode is a non-destructive dry-run. Execute mode may run
`npx supabase db dump --local --dry-run` against local Docker only. Evidence
JSON is written under gitignored `artifacts/restore-drills/`.

A dated staging restore is still required before public beta. Local CI
evidence is not a hosted restore.

## Monitoring and alerts

- Health: `GET /ops/health`
- Client errors: `POST /ops/client-errors` with allowlisted categorical JSON
- Forbidden in ingest and logs: email, prompt, health text, plan JSON, passwords, tokens
- Alert catalog and paging flags: `ops/contract.json`
- P0 pages immediately; P1 pages; P2 is ticketed

## On-call

Roles, ack minutes, and escalation live in `ops/contract.json`. Print the
roster without contact values:

```bash
npm run ops:oncall
```

Set `MOMENTUM_ONCALL_CONTACT` in the operator secret store, not in Git.

## Support (fa/en)

User-facing mailboxes are `VITE_SUPPORT_EMAIL` and `VITE_PRIVACY_EMAIL`. Empty
values keep the honest unconfigured UI. Do not invent an address.

Render an operator macro:

```bash
npm run ops:support -- PLAN-IMPORT-207 fa
npm run ops:support -- PLAN-IMPORT-207 en
```

Macros must include the issue code in both languages and must not ask for
health details, passwords, prompts, or plan JSON.

## Verification

```bash
npm run test:ops
```

CI runs that verifier on every Quality workflow and executes the local
restore drill after the database job starts Supabase. Hosted PITR and a
staging restore remain owner actions.
