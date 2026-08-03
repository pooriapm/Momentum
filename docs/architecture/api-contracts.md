# Edge API response contracts

All routes return JSON with `Cache-Control: no-store` except public
`geo-context`. Authenticated mutations require `Authorization: Bearer …`; every
AI or authoritative mutation also requires `Idempotency-Key` (8–128 allowed
characters). Error shape is always `{ "error": { "code", "message" } }` and
never includes provider or health details.

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
- `entitlement_usage` with used/limit/remaining for plan, coach and report
  extraction;
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
| `confirm-body-composition` | `measurement_id` only | `{body_composition:{id,measured_at,extraction_status:"confirmed",weight_kg,body_fat_percent,fat_mass_kg,lean_mass_kg,skeletal_muscle_mass_kg,visceral_fat_rating,waist_cm,basal_metabolic_rate_kcal,updated_at}}` |

Meal mutation dates are derived server-side from the stored profile timezone,
must fall inside the active plan, and are rechecked in the transactional RPC.
The client cannot write a past or future meal by changing its request body.

## AI routes

- `generate-plan` new success: HTTP 201
  `{job:{id,status:"completed"},plan:{plan_id,plan_version_id}}`. A completed
  same-key replay returns the same identifiers with `idempotent_replay:true`;
  an in-progress replay returns HTTP 202.
- `coach` success:
  `{thread_id,message,suggested_actions,safety:{level,reason}}`. Completed
  replays preserve safety and actions; in-progress replay is HTTP 202.
- `analyze-body-composition` new success: HTTP 201
  `{measurement:{id,extraction_status:"needs_confirmation",extraction_result}}`.
  It never returns or accepts a confirmed state. Completion occurs only through
  the account mutation above.
- `geo-context` returns display hints and active price rows plus
  `authoritative_for_checkout:false`; it never reports AI eligibility.

Failed/released AI idempotency keys are terminal and return 409 on replay. The
client must generate a new key for an explicit retry.
