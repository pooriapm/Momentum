# Edge API response contracts

Status: target pre-development contract. Operation names below are server/API
boundaries, never browser routes or evidence that an Edge Function is deployed.

All routes return JSON with `Cache-Control: no-store` except public
`geo-context`. Authenticated mutations require `Authorization: Bearer …`; every
AI or authoritative mutation also requires `Idempotency-Key` (8–128 allowed
characters). Error shape is always `{ "error": { "code", "message" } }` and
never includes provider or health details.

## Logical service manifest

| Service operation | Authority and purpose | Primary Inventory consumers |
| --- | --- | --- |
| Supabase Auth | sign-up/sign-in, verification, recovery, session refresh/revocation | `AUTH-*`, `ME-09` |
| `geo-context` | IP hint for anonymous product version (`ir`/`intl`); authenticated callers receive locked `product_region` | `PUB-03`–`PUB-11` |
| `onboarding-draft` | owner-bound get/save/version-conflict/resume for eight steps | `ONB-01`–`ONB-28` |
| `complete-onboarding` | lock draft, validate consent/safety/eligibility and normalize profile | `ONB-27/28`, `LIFE-01` |
| `account-dashboard` | current local-day projection, active plan and safe statuses | `TODAY-*`, `ME-01` |
| `plan-read` | active plan, immutable history/diff and five Plan views | `PLAN-*`, `LIFE-16/18/19/20` |
| `activity-mutations` | meal selection/completion, workout sessions/sets, check-ins, measurements | `EXEC-*`, `TODAY-05/06/11/12`, `PROG-*` |
| `account-settings` | profile/preferences, locale/calendar/units, notifications/accessibility | `ME-02`–`ME-04` |
| `entitlement-status` | one subscription, first-gift campaign/reservation and cycle gate | `PUB-07`–`PUB-11`, `LIFE-01`–`LIFE-11` |
| `generate-monthly-plan` | the only provider-calling operation; durable job/status/import | `LIFE-12`–`LIFE-20` |
| `account-export` | request/status/authorized expiring download | `ME-06` |
| `account-delete` | consequence confirmation, orchestration status and session revocation | `ME-07` |

An implementation may group logical operations behind fewer Edge Functions or
RPCs, but it must retain these authority, ownership, idempotency and error
boundaries. Changing grouping does not create new UI routes.

## Common mutation behavior

- The verified session supplies user identity; request bodies cannot select a
  different owner.
- Each write returns a durable resource/version and `updated_at`, not only
  `{ok:true}`.
- Versioned draft/settings writes accept an expected version and return
  `CONFLICT` plus a safe current projection on mismatch.
- Idempotent actions reuse the original result for the same key and digest;
  different input with the same key is rejected.
- Offline queues are allowed only for documented conflict-safe activity actions.
- Stable machine error codes map to localized Inventory states. Safe `message`
  is not the sole basis for client behavior.

## Auth and onboarding contracts

Supabase Auth owns credentials/tokens. Product data is created only for the
verified authenticated identity. Responses must not reveal whether an unrelated
email exists.

`onboarding-draft` returns:

```json
{
  "draft": {
    "version": 4,
    "current_step": "training",
    "completed_steps": ["basics", "goal", "consent", "health", "food"],
    "values": {},
    "updated_at": "2026-08-13T09:00:00Z"
  }
}
```

`values` is a server-filtered owner projection; sensitive health values are not
copied into analytics/logs. Save validates only the named step plus cross-step
constraints required for safety. Completion validates the entire locked draft,
versions consent, computes deterministic safety results and returns the
next valid `LIFE-*` status. Body evidence upload uses private owner paths and no
AI extraction operation.

## Settings, entitlement and privacy contracts

- Settings return canonical values plus server validation metadata. Sticky
  `product_region` is read-only for the user. Calendar, timezone, units and
  cuisine are editable. Default language and list currency follow region.
- Entitlement status returns one subscription state, gift campaign availability,
  authoritative reservation state and the next `ready_at`-derived boundary. It
  never returns a client-computable budget secret.
- Gift reservation is atomic and idempotent. Exhaustion cannot revoke an earlier
  reservation or imported plan.
- Export returns `requested|processing|ready|expired|failed`; ready downloads are
  short-lived and owner-authorized.
- Delete returns `confirmation_required|pending|completed|failed`; completion
  covers Auth, database, Storage and approved subprocessors before session loss.

## `account-data`

`dashboard` returns `{dashboard}`. The service derives `local_date` from the
authenticated user's stored IANA timezone. A request may omit `local_date`; if
it includes one for compatibility, it is only an assertion and must equal the
derived current date. Historical dashboard reads are not exposed by this MVP
contract. Its fields are:

- `local_date`;
- safe `profile`, including derived `email_confirmed` and
  `ai_country_verified` booleans but no verified country/method;
- `active_goal` with start/target weights and dates;
- selected-date `checkin`, descending `recent_checkins` (maximum 14), and
  `latest_body_weight` from confirmed/manual data;
- `entitlement_usage` with used/limit/remaining for the current monthly plan
  cycle; the limit is one provider execution and there is no report-extraction quota;
- `ai_access.plan = {state, reason}`, where state is `ready`,
  `pending_verification`, `region_blocked`, `disabled` or `safety_blocked`;
- safe `plan` projection or null. A plan includes metadata, summary,
  `content_locale`, grocery and safety sections, and one date-resolved `day`.
  The day contains target strategy/final targets, workout, and meals. Each meal
  option contains ingredients, nutrition confidence/source, nullable recipe,
  warnings and portability.

Mutations return:

| action | request fields | success envelope |
| --- | --- | --- |
| `complete-onboarding` | action only; content comes from locked draft | `{onboarding:{status,automation_block_reason,goal_id,country_code,ai_country_verified,consent_versions}}` |
| `select-meal` | `slot_key`, `option_key`; optional current-date assertion `local_date` | `{selection:{id,local_date,plan_version_id,slot_key,option_key,status,option_title,nutrition,updated_at}}` |
| `complete-meal` | same meal fields | `{completion:{...selection,completed_at,status:"completed"}}` |
| `save-body-composition` | normalized user-confirmed values and measurement date | `{body_composition:{id,measured_at,status:"confirmed",weight_kg,body_fat_percent,fat_mass_kg,lean_mass_kg,skeletal_muscle_mass_kg,visceral_fat_rating,waist_cm,basal_metabolic_rate_kcal,updated_at}}` |

Meal mutation dates are derived server-side from the stored profile timezone,
must fall inside the active plan, and are rechecked in the transactional RPC.
The client cannot write a past or future meal by changing its request body.

Workout execution uses `start_workout_session(local_date, workout_key)` and
`mutate_workout_session(session_id, action, exercise_key, set_number, values)`.
Both RPCs derive ownership from `auth.uid()` and validate the current local day
and active immutable plan version. Authenticated clients have read-only RLS
access to workout sessions, exercise logs and set logs; direct writes are not
granted. Supported mutations log set completion, weight, reps, RPE and rest;
complete/skip/substitute exercises; save notes; report pain; and finish or stop
the session. Pain severity 4–5 closes the session immediately.

## AI routes

- `generate-monthly-plan` requires a server-derived entitlement period. The first
  one uses the completed onboarding snapshot; month two and later also require
  a verified active subscription and include the previous plan plus structured
  adherence/outcome data. New success: HTTP 201
  `{job:{id,status:"completed",period_id},plan:{plan_id,plan_version_id,imported_at}}`. A completed
  same-key replay returns the same identifiers with `idempotent_replay:true`;
  an in-progress replay returns HTTP 202.
- `geo-context` returns `product_region` plus matching locale and price rows.
  For anonymous callers the region is an IP hint. For authenticated callers it
  is the locked account value and current IP is ignored.

Failed/released AI idempotency keys that still have a live job return the same
job on replay (HTTP 202). A new key is allowed only when the reservation was
released **before** successful import and the period still permits reservation.
Until import succeeds, the queue may retry the same job after a delay. The
user-facing wait times out at 3 minutes with an error and retry; retry reads
status if the job is still alive. After successful import, no new key can
invoke a model for that period.

There is no chat, coach-message, report-extraction, or on-demand recalibration
AI route. The bounded optional cycle note joins the same monthly generation request.
The server permits at most one successfully imported plan per user and entitled
monthly period. Provider, validation, or timeout failure before import does not
consume that allowance. A failed renewal preserves the previous imported plan.

## Stable error mapping

| Code | UI family | Required handling |
| --- | --- | --- |
| `AUTH_REQUIRED` / `EMAIL_UNVERIFIED` | `AUTH-*` | authenticate/verify, preserve safe destination |
| `CONSENT_REQUIRED` / `AGE_INELIGIBLE` | `ONB-*` | return to exact prerequisite or adult boundary |
| `SAFETY_BLOCKED` | `ONB-11/12`, `LIFE-07` | safe human/urgent path; no generation |
| `REGION_BLOCKED` | unused | deprecated; D12 must not return a geo-block |
| `ENTITLEMENT_REQUIRED` / `SUBSCRIPTION_INACTIVE` | `LIFE-08/10/11` | show one offer/recovery; prior plan stays visible |
| `GIFT_BUDGET_UNAVAILABLE` | `PUB-09`, `LIFE-05` | subscription/Preview; never imply lost reservation |
| `PERIOD_ALREADY_CONSUMED` / `JOB_IN_PROGRESS` | `LIFE-12/13` | open original durable status, never start another call |
| `PROVIDER_FAILED` | `LIFE-18` | queued retry + user retry; prior plan safe |
| `PLAN_VALIDATION_FAILED` | `LIFE-19` | queued retry + user retry; no partial activation |
| `PLAN_IMPORT_FAILED` | `LIFE-20` | retry import of preserved result; prior plan active |
| `CONFLICT` | `ONB-28`, settings/activity | compare/reload safely; preserve local input |
| `OFFLINE` | Today/Plan/Progress | cached read or explained disabled mutation |
| `RATE_LIMITED` | Auth/account | localized retry-after; no rapid repeated action |
| `EXPORT_PENDING` / `DELETE_PENDING` | `ME-06/07` | show durable request state, not duplicate request |

HTTP status alone never selects product copy. Unknown codes use a safe generic
recovery state and are logged without raw sensitive/provider payloads.
