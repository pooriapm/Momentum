# Momentum implementation blueprint

Version: 1.3  
Last reviewed: 2026-08-18  
Audience: product designers, engineers, QA and autonomous coding agents  
Status: **rewrite playbook; owner opened sequenced implementation on 2026-08-17 via [AGENT-DEVELOPMENT-PLAN.md](./AGENT-DEVELOPMENT-PLAN.md). Step 5 freeze signed 2026-08-18** ([design/STEP-5-FREEZE.md](./design/STEP-5-FREEZE.md)).

Current alpha code is drift where it contradicts D1–D13. Do not copy 7-day
trials, Core/Pro, weekly `generate-plan`, `analyze-body-composition`, or coach
surfaces. Design freeze: [design/STEP-5-FREEZE.md](./design/STEP-5-FREEZE.md). Agent
sequencing: [AGENT-DEVELOPMENT-PLAN.md](./AGENT-DEVELOPMENT-PLAN.md).

## 1. Build target

Momentum is an account-based Persian/English general-wellness product for adults.
It combines workout, nutrition and progress tracking with one background monthly
planning operation. AI is infrastructure, never a persona or destination.

The production target has exactly four authenticated destinations:

| Destination | User question | Route |
| --- | --- | --- |
| Today | What should I do next? | `/[locale]/app/today` |
| Plan | What is my current workout/nutrition plan? | `/[locale]/app/plan` |
| Progress | What happened and what will inform the next cycle? | `/[locale]/app/progress` |
| Me | How do I manage my profile, subscription and data? | `/[locale]/app/me` |

There is no Coach tab, chat route, message composer, assistant avatar, message
store, turn quota, on-demand generation or separate body-report AI analysis.

## 2. Non-negotiable business contract

1. Momentum offers one paid subscription. Tier names such as Core or Pro are not
   part of MVP.
2. Every entitled plan cycle permits at most one provider execution. One response
   must contain the complete workout-and-nutrition plan for the cycle.
3. The first complete plan is gifted only when a server-owned campaign is enabled
   and its dynamic budget can atomically reserve the configured conservative cost.
4. Gift exhaustion affects new reservations only. Existing reservations and all
   previously imported plans remain visible.
5. Cycle one begins at successful import (`ready_at`), not at a Gregorian,
   Persian or billing month boundary. `starts_at = ready_at`; `ends_at` is one
   calendar month later in the stored user timezone.
6. Cycle two and every later cycle require a server-verified active subscription.
7. Near cycle end the user sees a notice and may update structured inputs or add
   one bounded note (maximum 500 characters; soft guidance from 400). No action means carry forward onboarding, current profile,
   prior plan and prior outcomes by default.
8. Generation never happens early. It starts at the next cycle boundary after
   entitlement verification.
9. After provider execution starts, any provider, schema, validation or import
   failure consumes that cycle's call. Replays observe/reconcile the original job;
   they never invoke a model again.
10. A failed new plan never deletes, corrupts or hides the last valid plan.

## 3. Canonical experience surfaces

### 3.1 Public and authentication

| Route | Required content/states |
| --- | --- |
| `/[locale]` | value, Today/Plan preview, how it works, safety/privacy, one offer, FAQ, CTA |
| `/[locale]/pricing` | single subscription; gift available/exhausted/ineligible; region hold |
| `/[locale]/safety` | general-wellness boundary, exclusions, urgent help, AI limitation |
| `/[locale]/privacy` | data use, provider boundary, retention, export and deletion |
| `/[locale]/terms` | current pre-launch terms/version |
| `/[locale]/auth/sign-up` | email/password or approved method, terms consent, loading/error/success |
| `/[locale]/auth/sign-in` | credentials, recovery, verification state |
| `/[locale]/auth/verify` | pending, resend cooldown, expired, complete |
| `/[locale]/auth/recover` | request, sent and rate-limited recovery states |
| `/[locale]/auth/update-password` | new password, invalid/expired token and completion states |

The how-it-works explanation is a landing-page section in the canonical router,
not a standalone route.

Public pricing shows USD or IRR from sticky `product_region`. Locale does not
independently change list currency. There is no unavailable-region wall.

### 3.2 Onboarding

All steps are account-backed, resumable, URL-addressable and save only after a
successful forward action. Back navigation preserves valid input.

| Step | Route | Required outcome |
| --- | --- | --- |
| Entry/resume | `/[locale]/onboarding` | load the saved draft and redirect to the current valid step |
| Basics | `/[locale]/onboarding/basics` | name, DOB/adult gate, relevant sex input, height, weight and residence. Under-18 stops before health disclosure. `product_region` is already locked from signup. |
| Health | `/[locale]/onboarding/health` | exclusions, injuries, medication context and safety outcome. Blocked users do not continue to consent, food, training or body. |
| Consent | `/[locale]/onboarding/consent` | versioned terms, privacy and health-data consent |
| Goal | `/[locale]/onboarding/goal` | goal and conditional target weight |
| Food | `/[locale]/onboarding/food` | pattern, exclusions, governed allergen picker, preferences, budget and cooking constraints |
| Training | `/[locale]/onboarding/training` | location, schedule, duration, equipment and limitations/recovery |
| Body | `/[locale]/onboarding/body` | manual/non-generative values, evidence optional, confirm or skip |
| Review | `/[locale]/onboarding/review` | editable summary, payment-method collection (not charged), entitlement and durable generation/import states |

Offer, generation and ready status are states of Review and the authenticated
shell, not additional onboarding routes. Successful import enters
`/[locale]/app/today`; Preview enters the same route with `?preview=1`.

Equipment is enabled by selected training location. Home/custom locations expose
a compact typed/selectable equipment field; incompatible selections are
disabled with an explanation. Duration uses a compact dropdown with approved
values plus an accessible custom option.

### 3.3 Authenticated product

#### Today

Daily brief, next action, timeline, compact check-in, totals and one deterministic
progress observation. Required states: no plan, preparing, active/rest day,
offline cached, stale, completed day, safety pause and load error.

#### Plan

Week, Nutrition, Training, Grocery and Calendar views. Every plan exposes version,
effective interval, source cycle and human-readable changes. Meal/workout detail,
completion and substitutions use governed catalog IDs and deterministic rules.

#### Progress

Four-week default summary, adherence, recovery/energy/sleep, weight and optional
measurements, non-scale outcomes, check-ins and next-cycle readiness. Every chart
has a text summary and tabular alternative.

#### Me

The hub (`/[locale]/app/me`) is identity plus a short list: profile, subscription,
export/delete, appearance, language, PWA install (omit when already installed),
and sign-out. No “Private” badge. Routed task pages are
`/[locale]/app/settings` for editable preferences and
`/[locale]/app/account` for export/deletion. Subscription, history, help, legal
and sign-out remain in-page/dialog states unless the canonical router is changed.

### 3.4 Canonical semantic coverage

[Screen and State Inventory](./product/SCREEN-STATE-INVENTORY.md) is the
normative design ledger. It defines exactly 132 semantic states: 14 Public, 18
Auth, 28 Onboarding, 20 entitlement/lifecycle, 12 Today, 14 Plan, 10 daily
execution, 7 Progress and 9 Me/Settings/Account states.

Those IDs are the join key across PRD, Penpot, Storybook, implementation tickets
and verification. Theme, locale, width and accessibility preferences are
coverage dimensions; they must not be inflated into extra screen counts. A
component specimen or explanatory state card cannot satisfy a screen ID unless
it contains the complete context, action, transition and recovery contract.

Only the paths listed in §3.1–3.3 and the Account/Settings paths above are UI
routes. Meal/workout detail, execution, check-ins, plan subviews, plan history,
subscription and lifecycle remain in-page, dialog or sheet states. If product
needs a new deep link, update the router and every artifact before implementation.

### 3.5 Required prototypes

Penpot must provide eight clickable flows using the inventory IDs:

1. Acquisition: landing → sign-up → verification;
2. First plan: resume/onboarding (Basics → Health → Consent → Goal → Food → Training → Body → Review) → payment method → gift or subscription → generation/import → Today;
3. App navigation: Today ↔ Plan ↔ Progress ↔ Me ↔ Settings/Account;
4. Daily use: next action → meal/check-in → completion, including offline recovery;
5. Workout: ready → execute → pause/adapt/pain branch → finish/save;
6. Weekly progress: overview → table alternative → check-in → next-cycle readiness;
7. Account control: preferences/subscription/export/delete/sign-out;
8. Renewal/recovery: default carry-forward or optional note → entitlement → one
   generation → ready or terminal failure while the prior plan remains available.

Every action has a destination or intentionally disabled explanation. Back,
cancel, close, browser-back, Escape and focus return are defined where relevant.
Primary happy paths are demonstrated in Persian Compact Light and English
Expanded Dark; all semantic states are exhaustively fixture-tested in Storybook.

## 4. State machines

### 4.1 First-plan offer

```text
unknown
  -> checking
  -> gift_reserved        -> generation_eligible
  -> gift_unavailable     -> subscription_offer | preview
  -> region_blocked       -> explanation
  -> safety_blocked       -> safe_referral
  -> authentication_error -> recoverable_auth_action
```

Gift reservation is an atomic server operation. The UI never computes budget,
eligibility or price authority.

### 4.2 Monthly plan period

```text
draft -> awaiting_entitlement -> reserved -> provider_started
  -> validating -> importing -> ready
  -> failed_provider | failed_validation | failed_import
```

- `ready` writes `ready_at`, activates exactly one immutable version and starts
  the cycle.
- failures before import retry the same queued job after a delay (at most two
  automatic retries). The user-facing wait times out at 3 minutes with retry.
  After successful import, no second generation is allowed.
- before import, an abandoned reservation may be released under the documented
  reconciliation rules if no live job remains.
- the previous valid plan stays readable for every failure state.

### 4.3 Subscription and renewal

```text
none | gift_only | active | grace | payment_pending | cancelled | expired
```

Only `active` at the new cycle boundary can authorize cycle two+. `grace` and
`payment_pending` show a recovery action but do not start provider execution.
Cancellation stops future cycles, not history access.

### 4.4 Generation UI mapping

| Backend state | User-facing meaning | User action |
| --- | --- | --- |
| `queued`/`preparing` | Preparing your plan | May close and return |
| `generating` | Building the monthly plan | Wait/leave; queue retries transient failure |
| `validating`/`importing` | Checking and saving the plan | Wait/leave |
| `timed_out` / pre-import failure | Not ready after 3 minutes, or job failed | Error + retry; same live job is replay |
| `ready` | Plan is ready | View plan |
| `needs_input` | A specific prerequisite is missing | Fix named prerequisite |
| import failure | Valid result not saved; prior plan is safe | Retry import |

Do not fake exact percentages, expose provider names/raw errors, or stream raw output. After successful import there is no extra generation in that cycle.

## 5. Domain and data contracts

### Required aggregates

- Account/profile: identity, DOB, locale, timezone, country hints, verified
  eligibility evidence and consent versions.
- Goals/preferences: active goal, nutrition/training constraints, schedule,
  equipment and cuisine.
- Health context: minimized safety answers, declared allergies/limitations and
  confirmed body measurements with source metadata.
- Catalogs: versioned exercise/equipment/food/ingredient/allergen references.
- Plan: user-owned plan plus immutable versions, digest, schema/prompt/model
  versions, effective range and source period.
- Execution: meal selections/completions, workout sessions/sets, measurements
  and daily/weekly check-ins referencing immutable plan versions.
- Commerce: one product offer, subscription state, entitlement periods, first-
  plan campaign and atomic budget reservations.
- Generation: monthly period, minimized snapshot, usage reservation, provider job,
  validation result, import result and privacy-safe cost/trace metadata.
- Privacy: consent history, export request, deletion request and minimal receipt.

### Invariants

- All sensitive rows are owner-bound; `auth.users.id` is canonical.
- Only one active plan may cover a user's date.
- One period has zero or one provider-started job and zero or one imported version.
- Plans/logs reference immutable version IDs; later versions never rewrite history.
- Only confirmed/manual body values enter generation.
- Language, direction, country, billing market, currency, calendar, timezone,
  units and cuisine are separate fields.
- No raw prompt, full provider error, report content or next-cycle note enters
  general analytics/logging.

Machine schemas and table-level detail live in
[data-model.md](./architecture/data-model.md) and
[api-contracts.md](./architecture/api-contracts.md). Those files must be updated
with versioned migrations whenever an implementation field changes.

## 6. API behavior

All authenticated authoritative mutations use a verified session. Generation and
other costly/idempotent actions require `Idempotency-Key`. Errors use:

```json
{"error":{"code":"stable_machine_code","message":"safe localized summary"}}
```

Required services:

- `geo-context`: display hints only; never authoritative AI eligibility.
- account/auth settings and onboarding draft/completion.
- account dashboard/current active-plan projection.
- meal/workout/check-in/measurement owner-bound mutations.
- `generate-monthly-plan`: the only provider-calling route. Live `generate-plan` is weekly drift, not the contract.
- first-plan gift reservation, payment-method SetupIntent, billing-country webhook and later entitlement resolver.
- export and deletion orchestration.

There must be no `coach`, `chat`, `messages`, `analyze-body-composition` or
on-demand plan regeneration endpoint in the target API. Public generation
requires reviewed catalog `momentum-core@v2`.

### Stable failure codes

At minimum define and localize: `AUTH_REQUIRED`, `EMAIL_UNVERIFIED`,
`CONSENT_REQUIRED`, `AGE_INELIGIBLE`, `SAFETY_BLOCKED`,
`ENTITLEMENT_REQUIRED`, `SUBSCRIPTION_INACTIVE`, `GIFT_BUDGET_UNAVAILABLE`,
`PERIOD_ALREADY_CONSUMED`, `JOB_IN_PROGRESS`, `PROVIDER_FAILED`,
`PLAN_VALIDATION_FAILED`, `PLAN_IMPORT_FAILED`, `CONFLICT`, `OFFLINE`,
`RATE_LIMITED`, `EXPORT_PENDING` and `DELETE_PENDING`.

## 7. Design implementation contract

- Visual identity: **Human Strength — Deep Plum + Apricot**.
- Appearances: Light and Dark only. Increased contrast is behavior inside them,
  never a third theme collection.
- Liquid Glass is limited to functional navigation and temporary controls such
  as top/bottom chrome, popovers and sheets. Forms, content cards, plan rows,
  alerts and health information are opaque.
- Glass uses Regular by default, Prominent for one hierarchy-critical control,
  and Clear only over a controlled media/aura backdrop with a legibility layer.
- Press/drag may use localized highlight/refraction; a control may morph into its
  own menu/popover/compact sheet. The material is stable at rest: no idle shimmer,
  autonomous refraction, or page-wide pointer-following light.
- Every glass surface has an opaque reduced-transparency/unsupported fallback and
  a reduced-motion state without elastic geometry, optical travel, or morphing.
- Use semantic tokens from `docs/design/tokens.json`; never copy primitive color
  values from screenshots.
- Follow the current clean Penpot file for composition/flows and Storybook for
  executable component anatomy, variants and states. After onboarding, the user
  sees one wait screen until the monthly plan imports, then Today/Plan show the
  daily slice of that month (day strip, meals, workout, grocery) as on the live
  site. The rewrite fixes public, auth, onboarding, payment, and this wait
  experience first, including queue, 3-minute timeout, and retry. Mid-month there
  is no AI; daily check-in is optional and quiet; the weekly report is optional
  and prominent. Gift users start checkout after the last weekly report.
- Minimum target is 44×44 CSS points, focus is visible, text scales/reflows, and
  motion/transparency preferences are honored.
- Persian and English share one semantic tree. Logical layout follows locale;
  mixed emails, times, measurements and identifiers use bidi isolation. Never
  display the words `RTL` or `LTR` to users.
- Reference widths are 390px Compact (validated down to 320px), 768px Medium and
  1440px Expanded. Every shell/complex task has Compact and Expanded design;
  navigation changes, dense forms, charts and tables also have Medium design.
- Every chart includes equivalent text and table output. Every interaction has a
  ≥44×44 target, visible focus, logical reading order and large-text reflow.
- Every inventory ID has deterministic Persian/English and Light/Dark Storybook
  fixtures plus relevant loading/offline/error/preference variants.

## 8. Failure, offline and recovery policy

- Saved plans and read-only history remain usable during provider outage.
- Cached content is marked with last-sync time. Health mutations queue only when
  a conflict-safe contract exists; otherwise disable them with an explanation.
- Invalid model output never becomes partially active.
- Import failure preserves both the previous plan and enough privacy-safe state
  for server reconciliation.
- Payment/gift uncertainty is fail-closed: no provider execution before an
  authoritative entitlement reservation.
- Safety-blocked users receive a clear boundary and appropriate human/urgent-help
  path, not a generic system error.
- User input survives recoverable form/navigation/network errors.

## 9. Security, privacy and launch gates

- RLS on every private table in the creating migration; automated user-A/user-B
  isolation tests are mandatory.
- Service role and provider keys remain server-only; no `VITE_` secret.
- Sticky `product_region` (`ir` FA+IRR / `intl` EN+USD) is written once at signup.
- Real-user launch requires approved terms/privacy/retention, processor contracts,
  professional exercise/nutrition rules, deletion/export, monitoring, backup/
  restore, incident response and country Go/No-Go.
- Design completion and engineering completion are not legal permission to launch.

## 10. Implementation sequence after handoff approval

1. Freeze/version contracts, tokens, schemas and localized copy keys.
2. Establish environments, Auth, RLS, private Storage and observability baseline.
3. Implement locale-aware public/auth shell and account lifecycle.
4. Implement resumable onboarding and deterministic eligibility/safety rules.
5. Implement catalogs, immutable plans and deterministic Today/Plan execution.
6. Implement check-ins, Progress, history and next-cycle snapshot aggregation.
7. Implement one offer, dynamic gift reservation and subscription entitlement.
8. Implement the single monthly provider route, validators and atomic import.
9. Implement export/deletion, offline/read-only behavior and operational controls.
10. Run accessibility, localization, security, safety, cost, failure and visual
   suites; obtain professional/legal/provider/release approvals.

No step authorizes copying deprecated alpha UI or changing product rules.

## 11. Design-complete handoff gate

The production-code lock may be considered for removal only after:

- all 132 canonical IDs exist as named Penpot screens/state panels and matching
  Storybook fixtures;
- all eight prototypes pass with no orphan frame, dead end or unbound control;
- reusable controls are real token-bound component instances/variants with auto
  layout rather than duplicated drawings;
- Public/Auth/Onboarding, the four app destinations, execution, lifecycle,
  Settings, export and deletion include loading, empty, offline, stale, error,
  blocked, success, destructive and recovery states as relevant;
- Persian/English, Light/Dark, Compact/Medium/Expanded, long copy, localized
  numbers/dates/units, keyboard/screen reader, text scaling, reduced motion and
  reduced transparency have recorded evidence;
- PRD, Inventory, Blueprint, Traceability, Penpot and Storybook have no unresolved
  material contradiction or development-blocking `TBD`;
- the owner reviews the completed handoff, recorded defects are closed, and the
  owner explicitly authorizes production implementation.

Passing this gate means design is sufficiently specified; it does not mean the
application, legal approvals or launch gates are complete.

## 12. Implementation definition of done

Production implementation is complete only when:

- every row in [TRACEABILITY.md](./TRACEABILITY.md) has implementation and test evidence;
- all Penpot screens/states have a corresponding route/story or an explicit
  documented platform exception;
- Storybook covers every reusable component in both languages, both appearances,
  Compact/Medium/Expanded where composition changes and all interaction/system states;
- no user-facing coach/chat/direction-tech term or deprecated palette remains;
- one-call, `ready_at`, subscription, gift-budget and prior-plan-preservation
  invariants pass integration and concurrency tests;
- build, lint, unit, integration, RLS, E2E, accessibility and visual regression
  suites pass;
- launch blockers are either closed with dated evidence or keep the affected
  capability disabled in production configuration.

## 13. Required decision behavior for an AI implementer

- Do not invent product tiers, routes, AI calls, medical behavior or screen
  content absent from these contracts.
- Prefer deterministic code and governed catalogs over additional model work.
- If a legal/professional gate is unresolved, build the disabled state and keep
  the capability off; do not guess approval.
- If a visual detail is absent, compose it from current Penpot structure,
  Storybook anatomy and semantic tokens in that order.
- If a genuine contradiction remains, stop the affected implementation, record
  both sources and request a product decision. Do not silently follow old code.
- Never infer a route from a Penpot frame name or Storybook title. Use the
  canonical route manifest and render other semantic states inside their parent.
