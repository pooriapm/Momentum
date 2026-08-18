# Momentum product flows and information architecture

Version: 2.2
Last reviewed: 2026-08-17
Status: normative design handoff

This document defines navigation, composition, transitions and prototype
behavior. The exact semantic-state ledger is
[Screen and State Inventory](../product/SCREEN-STATE-INVENTORY.md). State IDs in
Penpot and Storybook must match that ledger.

## 1. Information architecture

Momentum has three shells. They must not be merged into one overloaded
navigation model.

### 1.1 Public and authentication shell

| Canonical route | Purpose |
| --- | --- |
| `/fa`, `/en` | Localized landing page |
| `/[locale]/pricing` | One subscription, gift explanation, and list currency from product version |
| `/[locale]/safety` | General-wellness, AI, medical and urgent-help boundaries |
| `/[locale]/privacy` | Data use, retention, export and deletion |
| `/[locale]/terms` | Terms of service and version/effective date |
| `/[locale]/auth/sign-up` | Account creation |
| `/[locale]/auth/sign-in` | Account access |
| `/[locale]/auth/verify` | Email/OTP verification |
| `/[locale]/auth/recover` | Recovery request |
| `/[locale]/auth/update-password` | Set a password after a valid recovery link |

How it works and FAQ are landing sections/disclosures, not standalone routes.
Public pages never infer a geo-block from language or IP. IP only chooses the
product version (Persian+Rial vs English+USD) until signup locks `product_region`.

Landing order:

1. value proposition and one primary CTA;
2. realistic Today and monthly Plan preview;
3. how structured profile, optional confirmed body values and preferences work;
4. workout and nutrition coverage;
5. privacy, safety and human-control principles;
6. one-subscription pricing preview and conditional gift explanation;
7. FAQ and final CTA.

### 1.2 Onboarding shell

Onboarding is authenticated, account-backed, resumable and URL-addressable.
Forward navigation persists only after a successful save; Back preserves valid
input.

| Step | Canonical route | Required outcome |
| --- | --- | --- |
| Entry/resume | `/[locale]/onboarding` | Resolve saved draft to earliest incomplete valid step |
| Basics | `/[locale]/onboarding/basics` | Name, DOB/adult gate, relevant sex input, height, weight and country. Under-18 or IR/unsupported stops before Health. |
| Health | `/[locale]/onboarding/health` | Exclusions, injury/medication context, governed allergen picker and safety result |
| Consent | `/[locale]/onboarding/consent` | Versioned terms, privacy and health-data consent; only after eligible Health |
| Goal | `/[locale]/onboarding/goal` | Goal and conditional target weight |
| Food | `/[locale]/onboarding/food` | Pattern, exclusions, catalog allergen multi-select, preferences, budget and cooking constraints |
| Training | `/[locale]/onboarding/training` | Location, schedule, duration, equipment, limitations and recovery |
| Body | `/[locale]/onboarding/body` | Manual/non-generative values, optional private evidence, confirm or skip |
| Review | `/[locale]/onboarding/review` | Editable summary, payment method (not charged), gate and durable generation/import status |

Offer, generation, validation, import and ready are Review/authenticated-shell
states, not routes. The Body step makes no provider call. Only confirmed manual
or deterministically read values may join the one monthly combined request.

Training rules:

- seven weekdays must fit or reflow without clipping in both languages;
- duration uses an approved select plus an accessible custom option;
- Home/Custom enables compact typed/selectable equipment;
- Gym/No-equipment hides or disables incompatible equipment with an explanation;
- mixed numbers, times and units use locale formatting and bidi isolation.

### 1.3 Authenticated shell

The four primary destinations are stable:

| Key | Persian | English | Canonical route |
| --- | --- | --- | --- |
| `today` | امروز | Today | `/[locale]/app/today` |
| `plan` | برنامه | Plan | `/[locale]/app/plan` |
| `progress` | پیشرفت | Progress | `/[locale]/app/progress` |
| `me` | حساب من | Me | `/[locale]/app/me` |

Two task routes live under Me:

- `/[locale]/app/settings`: profile/preferences, locale, units, notifications,
  appearance and accessibility;
- `/[locale]/app/account`: export and deletion requests.

Meal/workout detail, workout execution, check-ins, Week/Nutrition/Training/
Grocery/Calendar, subscription/history, next-cycle note and sign-out are in-page,
sheet or dialog states. They are not standalone routes. There is no Coach, chat,
composer or AI destination.

## 2. Responsive shell behavior

| Width | Reference | Navigation | Composition |
| --- | ---: | --- | --- |
| Compact | 390px; validate to 320px | Glass bottom navigation and restrained top bar | Single column; sheets may become full screen at large text |
| Medium | 768px | Inline-start rail | One/two-column adaptive content; forms/charts/tables recompose |
| Expanded | 1440px | Inline-start sidebar | Bounded main column plus optional contextual rail |

Safe-area padding is additive. Compact chrome (top bar and four-item dock) is
overlayed on a **single scroll root** (`.app-workspace`). Nested `overflow-x:
hidden` on inner pages is forbidden because it creates a second vertical
scroller. On compact scroll-down the dock and top bar use Apple tab-bar
minimize (`glassMorph` / `glassRelease`); scroll-up restores labels. Resting
compact nav keeps labels; icon-only is only the minimized scroll state.
Navigation item semantic order remains Today, Plan, Progress, Me; writing
direction determines physical placement.
must not lose draft/selection/scroll task context. Glass remains functional
chrome only and always has an opaque reduced-transparency fallback. Press/drag
may use a localized optical response, and a contextual surface may morph from its
own source control; both resolve immediately to stable states under Reduced Motion.

## 3. Screen composition

### 3.1 Today

Order by immediate decision value:

1. DailyBrief: date, period/status, deterministic observation and one next action;
2. next meal/workout/recovery;
3. chronological timeline;
4. optional quiet daily check-in (not a primary CTA);
5. totals/adherence;
6. one deterministic progress observation, never an AI message.

The first Compact viewport has no more than one hero, one primary action and four
compact metrics. Required IDs are `TODAY-01`–`TODAY-12`.

### 3.2 Plan

Week, Nutrition, Training, Grocery and Calendar are peer views inside the Plan
route. The current day is the default. Each active plan exposes immutable version,
source cycle, effective interval and readable changes. Meal/workout detail and
substitution are progressive disclosures using governed catalog IDs and
deterministic rules. Required IDs are `PLAN-01`–`PLAN-14`.

### 3.3 Daily execution

Meals support ready, completed and deterministic substitution states. Workout
supports preview, active set/rest, pause/resume, skip/substitute, pain caution,
urgent safe stop, finish, saving and save failure while preserving local progress.
These states remain inside Today/Plan. Required IDs are `EXEC-01`–`EXEC-10`.

### 3.4 Progress

Progress defaults to a four-week summary and includes adherence, recovery,
sleep/energy, optional measurements, non-scale outcomes, a prominent optional
weekly report and next-cycle readiness (gift users start checkout here). Daily
check-in stays optional and quiet on Today. Every chart has equivalent text and
data table. Caution and referral never use color alone. Required IDs are
`PROG-01`–`PROG-07`.

### 3.5 Me, Settings and Account Data

Me is a **minimal hub**: identity, profile, subscription, export/delete,
appearance, language, PWA install (hidden when already installed), and
sign-out. Do not show a “Private” badge or privacy-theater cards. Settings and
Account Data use their canonical task routes. Plan history (ME-05) and
help/legal (ME-08) stay reachable from subscription/account/legal, not as hub
marketing. Export/delete expose durable pending and failure states; destructive
actions require explicit confirmation. Required IDs are `ME-01`–`ME-09`.

## 4. Monthly lifecycle

AI is a background provider operation, not a character or destination.

```text
eligibility_check
  -> gift_available -> atomic_reservation -> reserved
  -> gift_unavailable -> single_subscription | preview
  -> region_blocked -> explanation
  -> safety_blocked -> human_or_urgent_path

reserved_or_active_entitlement
  -> queued/preparing
  -> provider_started  # one in-flight combined workout+nutrition job
  -> validating
  -> importing
  -> ready             # write ready_at; activate one immutable version
  -> timeout | provider_failed | validation_failed  # retry same job until import
  -> import_failed     # retry import of preserved result
```

- `starts_at = ready_at`; `ends_at` is one user-timezone calendar month later.
- Gift budget is server-owned and atomically reserved. Exhaustion affects only
  new reservations.
- Cycle two+ requires active server-verified subscription at the boundary.
- The next-cycle notice allows structured updates and one optional note capped at
  500 characters with soft guidance from 400.
  No action carries forward baseline, prior plan and outcomes.
- Generation never starts early. Leaving the wait screen is allowed. After 3
  minutes the user sees an error and can retry; a live job is replayed, not
  duplicated.
- Provider/validation/timeout failure before import does not consume the cycle
  allowance. The queue retries the same job after a delay. Import failure retries
  only the import. After successful import there is no second provider call. The
  previous valid plan stays readable.
- No completion, check-in, body upload, substitution or settings action makes a
  separate AI call.

Required IDs are `LIFE-01`–`LIFE-20`.

## 5. State transition rules

### 5.1 Loading

Use skeletons only when geometry is known. Otherwise use a single announced
indeterminate status. Never fake generation percentages. Loading actions preserve
label and width and block duplicates.

### 5.2 Empty

Explain why content is empty and offer exactly one relevant next action. Empty is
not failure and must not blame the user.

### 5.3 Offline and stale

The server is authoritative. Cached plan/history remains readable with last-sync
time. Queue a mutation only when conflict behavior is explicit; otherwise leave
the control visible but disabled with an explanation. Recovering the connection
must not create duplicate completions, check-ins, reservations or provider calls.

### 5.4 Error and blocked

Preserve user input and existing plans. State what is safe, name one valid action
and avoid provider/infrastructure details. Safety/region/entitlement blocks are
domain decisions, not generic system errors. After provider start, no copy or CTA
may imply that another generation is available.

### 5.5 Success and destructive actions

Success confirms the durable outcome, not merely a button press. Reversible
actions state the undo window. Export/deletion/cancellation show consequence,
scope and status; cancellation affects future generation but not plan history.

## 6. Eight clickable prototype flows

### FLOW-01 Acquisition

`PUB-01/02` → optional `PUB-03/05` → `AUTH-07` → `AUTH-11` → `AUTH-12/15`.
Branches cover sign-in return, Iranian vs international version, validation and expired link.

### FLOW-02 First plan

`ONB-01/02` → `ONB-03/04` → `ONB-09`…`ONB-12` → `ONB-07/08` → `ONB-05/06` →
`ONB-13`…`ONB-26` → `ONB-27/28` → `LIFE-01` → `LIFE-08` payment method →
gift/subscription decision → `LIFE-12`…`LIFE-16` → `TODAY-01`. Branches cover
save conflict, safety pause, sticky region, gift unavailable, missing payment method
and all terminal generation failures.

### FLOW-03 App navigation

`TODAY-01` ↔ `PLAN-01` ↔ `PROG-01` ↔ `ME-01` → `ME-02/03/06` → Today.
Compact bottom navigation and top bar stay pinned to the device frame, share
one inner scroller, and minimize on scroll-down. Medium rail, Expanded sidebar,
focus and selected state are demonstrated.

### FLOW-04 Daily use

`TODAY-01` → `EXEC-01/02/03` and `TODAY-11/12` → `TODAY-05/06`. Offline,
stale, undo and caution-result branches retain context.

### FLOW-05 Workout

`EXEC-04` → `EXEC-05` → `EXEC-10`; branches include `EXEC-06/07/08/09` and
save failure. Urgent flow ends safely and never diagnoses.

### FLOW-06 Weekly progress

`PROG-01` → `PROG-02` → `PROG-05` → `PROG-06` → `PROG-07`. Include
insufficient-data, offline and professional-referral branches.

### FLOW-07 Account control

`ME-01` → `ME-02/03/04/05/06/07/08/09`. Include denied notification,
cancelled subscription, export pending/expired, delete error and sign-out failure.

### FLOW-08 · Renewal/recovery

`PROG-07` → `LIFE-08` (gift/unpaid checkout) or `LIFE-09/10/11` → `LIFE-12`…`LIFE-16`.
Show last-weekly understanding, optional note, inactive subscription, queued
retry after timeout/failure, and preservation of the previous plan.

## 7. Prototype acceptance

1. Each flow has a named start point and every listed branch reaches a terminal
   or returns to a safe parent.
2. Every control has a destination, overlay result or intentionally disabled
   explanation; no orphan frame or dead end remains.
3. Back, Cancel, Close, browser Back, Escape and focus return are defined and do
   not silently discard confirmed data.
4. Happy paths run in Persian Compact Light and English Expanded Dark. State
   coverage boards and Storybook provide all other locale/theme/width evidence.
5. The prototype contains no user-facing `RTL`/`LTR`, raw prompt/provider error,
   coach/chat, tier comparison, extra generation or separate body AI language.
6. Functional glass is limited to navigation/temporary overlays; content and
   health layers are opaque. The walkthrough includes one press/release, one
   direct-manipulation response, and one reversible source-linked morph plus their
   reduced-motion/transparency paths; no glass moves autonomously at rest.

## 8. Handoff evidence

For each state ID record:

- canonical route and parent overlay type;
- Penpot frame/panel name and prototype connection;
- Storybook story/fixture and locale/theme/viewport coverage;
- component instances and semantic token roles;
- primary/secondary/destructive actions and next state IDs;
- keyboard/focus/announcement contract;
- loading/offline/error recovery and analytics event if applicable.

Design is not complete until the 132-state inventory, eight prototypes, component
library, PRD, Blueprint, Traceability, Penpot and Storybook agree.
