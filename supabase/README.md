# Momentum Supabase target backend

Status: pre-development contract. Existing migrations/functions may still
represent the superseded alpha and must not be deployed as the target product.
Use [Implementation Blueprint](../docs/IMPLEMENTATION-BLUEPRINT.md) and
[Traceability](../docs/TRACEABILITY.md) as the migration entry point.

This directory is the backend source of truth for authenticated Momentum data.
The browser may retain theme/locale and an authentication session, but must not
persist profiles, health context, plans, logs, next-cycle notes, prompts, or
provider responses.

## Prerequisites

- Docker Desktop
- Supabase CLI
- An OpenAI API key for live AI calls

## Local setup

```bash
supabase start
supabase db reset
supabase status
```

Copy `supabase/.env.example` to a file outside Git, replace the local Supabase
keys from `supabase status`, add an OpenAI key, and serve functions:

```bash
supabase functions serve --env-file /absolute/path/to/momentum.local.env
```

`supabase db reset` applies migrations and `supabase/seed.sql`. The initial
migration creates:

- account, goal, preference, health, measurement and training tables;
- immutable plan versions plus relational daily tracking;
- monthly plan period/snapshot, subscription, gift reservation, generation job,
  entitlement and usage-ledger tables;
- RLS/column policies, owner-scoped indexes and atomic onboarding, meal and
  body-confirmation service RPCs;
- the private `body-composition` Storage bucket;
- preview Iranian and global pricing.

## Edge Functions

| Function | Auth | Purpose |
| --- | --- | --- |
| `geo-context` | public | Suggests locale, cuisine region and preview prices; never authorizes checkout |
| `generate-monthly-plan` | JWT | The only provider route: reserves one cycle execution and imports one validated combined workout-and-nutrition plan |
| `account-data` | JWT | Safe dashboard plus idempotent onboarding, confirmed body-value and meal select/complete mutations |

There is no target `coach`, chat/message, `analyze-body-composition`, plan-
revision or on-demand regeneration function. Body values are entered manually or
read non-generatively and explicitly confirmed before the monthly request.

The monthly generation function requires an `Idempotency-Key` header. The usage reservation stores
a request SHA-256 and attempt token. Reusing a key with different input is
rejected; concurrent replays do not make a second provider call. After provider
execution begins, failure is terminal for that cycle and a new key cannot invoke
the provider again.

AI is disabled by default. Before enabling monthly generation, configure a confirmed
email flow, the required `CURRENT_*_VERSION` secrets, exact origins, the master/feature
switches and the global request circuit breaker. Sticky `product_region` (`ir` or
`intl`) is locale and list-currency, not an AI geo-block. Iran is a served version.

Dashboard projection (no raw `plan_versions.content` is exposed to clients):

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/account-data \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"dashboard"}'
```

`local_date` is derived from the stored, validated profile timezone. A supplied
date is accepted only as a compatibility assertion when it equals that derived
current date; this endpoint does not expose historical dashboard reads.

If an older or malformed plan cannot be safely projected, the response keeps
the remaining dashboard data and returns `plan: null`.

The canonical dashboard response is:

```text
{ dashboard: {
  local_date,
  profile: { display_name, date_of_birth, sex, height_cm, locale, timezone,
             country_code, pricing_market, unit_system, onboarding_status,
             automation_block_reason, email_confirmed, ai_country_verified },
  active_goal, checkin, recent_checkins, latest_body_weight,
  entitlement_usage,
  ai_access: { plan: { state, reason } },
  plan: { id, version_id, schema_version, content_locale, name, valid_from,
          valid_to, locale, summary, grocery_list, health_safety_notes,
          day: { local_date, day_index, title, training_type, target_strategy,
                 targets, workout, meals } } | null
} }
```

Each projected meal option contains only canonical fields: `option_key`,
`title`, `ingredients`, `nutrition` (including confidence/source), nullable
`recipe`, `portable` and `warnings`. No raw `plan_versions.content` is granted
to clients.

Example meal selection:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/account-data \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: meal-current-lunch-01" \
  -d '{
    "action": "select-meal",
    "slot_key": "lunch",
    "option_key": "lunch-1"
  }'
```

The Edge Function and SQL RPC derive/recheck the user's profile-local current
date and verify that the date, slot and option belong to the authenticated
user's active immutable plan version. The client cannot select an arbitrary
date or option by inventing request values. An optional `local_date` field is
only a same-day assertion.

Use the same payload with `"action":"complete-meal"` to receive
`{completion:{... status:"completed", completed_at }}`. Completion validates
the active immutable option and locks a completed meal against option changes.

Onboarding completion requires a confirmed email and an idempotency header:

```json
{ "action": "complete-onboarding" }
```

The RPC validates and normalizes the server-loaded draft, stores the configured
consent versions, blocks minor/high-risk automation, attempts an atomic first-
plan gift reservation when campaign/market/budget policy permits, deletes the
draft and returns:

```text
{ onboarding: { status, automation_block_reason, goal_id, country_code,
                ai_country_verified, consent_versions } }
```

Body-report evidence, when enabled, is uploaded to the owner's private
`body-composition/{user_id}/...` prefix. Confirmed normalized values are saved
through an owner-bound service mutation with range, unit and source validation.
There is no generative extraction step and unconfirmed values never enter a
monthly snapshot.

## Hosted deployment

Set secrets only in Supabase, never in frontend build variables:

```bash
supabase secrets set --env-file /absolute/path/to/momentum.production.env
supabase db push
supabase functions deploy geo-context
supabase functions deploy generate-monthly-plan
supabase functions deploy account-data
```

Configure production auth URLs and replace `ALLOWED_ORIGINS` with exact HTTPS
origins. Rotate `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and
`OPENAI_SAFETY_PEPPER` immediately if they are exposed.

## Validation

```bash
supabase db lint
supabase db reset
deno fmt --check supabase/functions
deno lint supabase/functions
deno check supabase/functions/geo-context/index.ts
deno check supabase/functions/generate-monthly-plan/index.ts
deno check supabase/functions/account-data/index.ts
```

Before production, execute the multi-user RLS scenarios in
`docs/security/rls.md`, verify account export/deletion, and run representative
AI evals. The preview prices in `seed.sql` are not checkout authorization and
must receive a final margin review.
