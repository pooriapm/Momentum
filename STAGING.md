# Simple staging

Test site: https://momentum-staging.pooria-pm.workers.dev

This is one Cloudflare Worker and one separate Supabase free-tier project
(`phqnttkdjvhtqmqloyyj`, Ireland). Use test accounts and synthetic data. Production
accounts do not work here. Live AI and real payments are disabled.

One confirmed test account is ready. Its login details are in the ignored,
owner-readable `.tmp/staging-login.txt`. Only this account is enrolled in the
staging test cohort; public enrollment remains disabled. No email is sent to
the synthetic test address.

## Update the test site

```sh
npm run deploy:staging
```

This builds the current checkout with `.env.staging.local`, writes to
`dist-staging/`, and deploys only `momentum-staging`. It rejects a production
database URL. Cloudflare CLI login is required. For local development against
staging, use `npm run dev -- --mode staging`.

The ignored `.env.staging.local` contains only the staging URL, public API key,
and `VITE_APP_ENV=staging`. On another machine, retrieve the public key from the
staging Supabase dashboard and copy the format in `.env.example`.

## Backend changes

Apply new migrations to the staging project before deploying changed functions.
Always specify the staging project explicitly; the normal local CLI link still
points to production. The initial isolated CLI workspace is `.tmp/staging/`.

```sh
npx supabase db push --workdir .tmp/staging
npx supabase functions deploy account-data account-settings checkins generate-monthly-plan geo-context --project-ref phqnttkdjvhtqmqloyyj --import-map supabase/functions/deno.json --use-api
```

If the direct database connection is unavailable, use the staging session-pooler
connection from its dashboard with `db push --db-url`. The database password is
saved locally in the ignored `.tmp/staging-db-password` file (owner-readable only).
Server settings are in ignored `supabase/.env.staging.local`; update them with
`supabase secrets set --project-ref phqnttkdjvhtqmqloyyj --env-file supabase/.env.staging.local`.

## Keep it small

- No custom domain, paid database add-ons, or extra deployment pipeline.
- Supabase may pause an inactive free project; resume it in the dashboard.
- Email confirmation remains enabled. Supabase's built-in email service has
  restrictions; use dashboard-created confirmed test users when testing login.
- Staging setup does not claim a completed backup restore drill or public launch
  approval. Those are separate future tasks.

## Setup verification — 2026-09-09

All 37 migrations and five backend functions were deployed. The hosted checks
passed for sign-in, dashboard loading, owner/other-user/anonymous profile access,
exact-origin CORS, unauthorized requests, and session revocation. The extra
isolation-test account was deleted; the staging tester remains available.

Lint, the production and staging builds, the full 499-test suite, and the updated
operations checks passed. Browser sign-in reached Today without page errors and contacted only the staging
backend. The hosted restore remains `not_rehearsed`.

## Stability verification — 2026-09-13

Published Worker version `765f5764-5818-43c8-bd9e-31e7e0ac9685` with the current
onboarding/import fixes and connection resilience changes. The connectivity probe
confirms a failed read with one bounded retry; browser offline events still lock
writes immediately. A failed Today refresh retains the displayed plan and workout
form while disabling writes until refresh succeeds. Workout controls also lock
while a save is pending.

Validation: 516 unit tests, lint, production/staging builds, and the Chromium PWA
connection-loss/recovery test passed. Five consecutive frontend and authenticated
Auth health probes returned HTTP 200, as did three authenticated workout reads.
The hosted HTML asset references match `dist-staging/index.html`. These checks are
a point-in-time verification, not a continuous uptime guarantee.
