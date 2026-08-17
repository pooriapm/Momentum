# Momentum canonical screen and state inventory

Version: 1.4  
Last reviewed: 2026-08-17  
Status: normative design-completion ledger  
Scope: responsive web product, Persian and English, Light and Dark

This ledger defines the complete semantic state set required before production
development starts. It prevents a collection of isolated components from being
mistaken for a designed product. The inventory contains **exactly 132 semantic
states** across nine product areas. Locale, appearance, viewport and accessibility
preferences are test dimensions of each state; they do not create new semantic
state IDs.

[Design handoff](../design/HANDOFF.md) records Penpot/Storybook evidence rules
for these IDs. It is not allowed to define a second ID set.

## How to use this ledger

- A **semantic state** is a meaningfully different user situation, decision or
  recovery path. Hover, focus and pressed are component states, not separate
  screen-state IDs.
- `Route` is limited to paths accepted by the canonical router. `In-page`,
  `dialog` and `sheet` mean the state must remain on its parent route.
- Penpot must contain a named screen/frame or state panel carrying the ID.
- Storybook must contain a deterministic fixture carrying the same ID in its
  story name, parameters or documentation.
- A state is complete only when its primary action, back/dismiss behavior, next
  state, error recovery and accessible announcement are specified.
- `preview=1` is a development/demo projection of the authenticated shell, not a
  separate product entitlement or public route.

## Canonical route manifest

The implementation may render internal views with tabs, sheets, dialogs or local
state, but it must not invent routes outside this manifest without a versioned
product and router decision.

| Surface | Canonical route |
| --- | --- |
| Landing | `/[locale]` |
| Pricing | `/[locale]/pricing` |
| Safety | `/[locale]/safety` |
| Privacy | `/[locale]/privacy` |
| Terms | `/[locale]/terms` |
| Authentication | `/[locale]/auth/{sign-up|sign-in|verify|recover|update-password}` |
| Onboarding resume | `/[locale]/onboarding` |
| Onboarding step | `/[locale]/onboarding/{basics|health|consent|goal|food|training|body|review}` |
| Today | `/[locale]/app/today` |
| Plan | `/[locale]/app/plan` |
| Progress | `/[locale]/app/progress` |
| Me | `/[locale]/app/me` |
| Account data | `/[locale]/app/account` |
| Settings | `/[locale]/app/settings` |

Meal detail, workout execution, check-ins, grocery/calendar views, plan history,
subscription management and next-cycle note are in-page regions, dialogs or
sheets on the canonical parent route. A future deep-link decision must update
the router, this ledger, the PRD, Penpot, Storybook and traceability together.

## State count

| Area | IDs | Count |
| --- | --- | ---: |
| Public | `PUB-01`–`PUB-14` | 14 |
| Authentication | `AUTH-01`–`AUTH-18` | 18 |
| Onboarding | `ONB-01`–`ONB-28` | 28 |
| Entitlement and monthly lifecycle | `LIFE-01`–`LIFE-20` | 20 |
| Today | `TODAY-01`–`TODAY-12` | 12 |
| Plan | `PLAN-01`–`PLAN-14` | 14 |
| Daily execution | `EXEC-01`–`EXEC-10` | 10 |
| Progress | `PROG-01`–`PROG-07` | 7 |
| Me, settings and account data | `ME-01`–`ME-09` | 9 |
| **Total** |  | **132** |

## Public — 14 states

| ID | Route / form | Required meaning and action |
| --- | --- | --- |
| PUB-01 | `/[locale]` expanded | Complete landing narrative, eligible-market neutral state and sign-up CTA |
| PUB-02 | `/[locale]` compact | Compact landing with closed navigation and one above-fold CTA |
| PUB-03 | `/[locale]` menu | Accessible compact navigation open; focus return and dismissal defined |
| PUB-04 | `/[locale]` region checking | Resolving IP to choose product version (`ir` FA+IRR vs `intl` EN+USD), not eligibility |
| PUB-05 | `/[locale]` Iranian public version | Persian landing with Rial prices and full sign-up; not an unavailable wall |
| PUB-06 | `/[locale]` FAQ disclosure | One FAQ expanded; keyboard and screen-reader state defined |
| PUB-07 | `/[locale]/pricing` eligible | One subscription and conditional first-plan gift explanation |
| PUB-08 | `/[locale]/pricing` gift available | Campaign available, but reservation occurs only after authenticated review |
| PUB-09 | `/[locale]/pricing` gift unavailable | Budget exhausted/disabled for new users; paid offer and preview remain clear |
| PUB-10 | `/[locale]/pricing` Iranian prices | IRR list price, gift and checkout available; sticky region, not a geo-block |
| PUB-11 | `/[locale]/pricing` load error | Price authority unavailable; no guessed currency or entitlement |
| PUB-12 | `/[locale]/safety` | General-wellness boundary, exclusions and urgent-help disclosure |
| PUB-13 | `/[locale]/privacy` | Data use, provider boundary, retention, export and deletion |
| PUB-14 | `/[locale]/terms` | Current terms, version/effective date and return action |

## Authentication — 18 states

| ID | Route / form | Required meaning and action |
| --- | --- | --- |
| AUTH-01 | `auth/sign-in` default | Credentials, recovery and create-account paths |
| AUTH-02 | `auth/sign-in` validation | Field-level correction with values preserved |
| AUTH-03 | `auth/sign-in` submitting | Width-stable loading action; duplicate submit blocked |
| AUTH-04 | `auth/sign-in` rejected | Safe credential error without account enumeration |
| AUTH-05 | `auth/sign-in` unverified | Explain verification requirement and offer resend |
| AUTH-06 | `auth/sign-in` offline/rate-limited | Distinguish connection wait from retry-after state |
| AUTH-07 | `auth/sign-up` default | Account inputs and versioned terms/privacy consent |
| AUTH-08 | `auth/sign-up` validation | Password/consent correction without clearing data |
| AUTH-09 | `auth/sign-up` submitting | Announced progress and duplicate prevention |
| AUTH-10 | `auth/sign-up` existing account | Non-enumerating recovery/sign-in guidance |
| AUTH-11 | `auth/sign-up` verification sent | Durable next step and correct-email affordance |
| AUTH-12 | `auth/verify` waiting | Verification pending with leave-and-return behavior |
| AUTH-13 | `auth/verify` resend cooldown | Visible remaining wait without disabled-action ambiguity |
| AUTH-14 | `auth/verify` expired/invalid | Request a new link; never strand the user |
| AUTH-15 | `auth/verify` complete | Continue to onboarding or the saved destination |
| AUTH-16 | `auth/recover` request | Email field, privacy-safe response and sign-in return |
| AUTH-17 | `auth/recover` sent/rate-limited | Durable confirmation or explicit retry-after guidance |
| AUTH-18 | `auth/update-password` valid/error/complete | Valid-link form plus invalid-link and success panels in one routed flow |

## Onboarding — 28 states

| ID | Route / form | Required meaning and action |
| --- | --- | --- |
| ONB-01 | `/onboarding` loading | Load account-backed draft with no progress fabrication |
| ONB-02 | `/onboarding` resume | Return to earliest incomplete valid step; restart is secondary |
| ONB-03 | `basics` default | Name, birth date, adult gate, relevant sex input, height, weight and country. IR or unsupported country stops before Health. |
| ONB-04 | `basics` validation | Locale-safe dates/digits/units and under-18 boundary |
| ONB-05 | `goal` default | Goal selection with neutral, non-body-shaming language |
| ONB-06 | `goal` conditional target | Target weight appears only for relevant goal and stays optional/safe |
| ONB-07 | `consent` default | Separate versioned terms, privacy and health-data consent. Reached only after eligible Health. |
| ONB-08 | `consent` required/error | Missing consent named; independent choices preserved |
| ONB-09 | `health` default | Minimized screening, injury, medication and governed allergen picker. Runs immediately after Basics. |
| ONB-10 | `health` eligible | Clear result and continue action without medical claim |
| ONB-11 | `health` automated-plan blocked | Human-professional referral; no generation path; no further health/food/body collection |
| ONB-12 | `health` urgent | Plain urgent-help boundary and safe exit |
| ONB-13 | `food` default | Pattern, exclusions, catalog allergen multi-select, preferences, budget and cooking constraints |
| ONB-14 | `food` conflict/error | Allergy/conflict correction with prior choices preserved; unmapped “other” blocks generation with a human path |
| ONB-15 | `training` default | Location, schedule, days, duration, experience and recovery |
| ONB-16 | `training` home/custom | Typed/selectable equipment enabled and compact |
| ONB-17 | `training` gym/no-equipment | Conditional equipment hidden/disabled with explanation |
| ONB-18 | `training` weekdays | Seven labels fit/wrap at compact width in Persian and English |
| ONB-19 | `training` custom duration | Approved dropdown plus accessible custom value |
| ONB-20 | `training` validation | Day-count, time and limitation errors; centered icons/text |
| ONB-21 | `body` empty | Optional manual values, private evidence explanation and skip |
| ONB-22 | `body` manual entry | Source, value, unit and measurement date are editable |
| ONB-23 | `body` upload progress | Local validation, upload progress, cancel and privacy boundary |
| ONB-24 | `body` upload error | Retry/remove without claiming AI analysis or losing manual values |
| ONB-25 | `body` confirmation | Only confirmed manual/non-generative values become eligible input |
| ONB-26 | `body` skipped | Explicit skip confirmation and return/edit path |
| ONB-27 | `review` complete summary | Editable section summary, payment-method collection (not charged), safety/region/entitlement status and consent |
| ONB-28 | `review` save/conflict/transition | Preserve draft on offline/conflict; successful action enters lifecycle gate |

## Entitlement and monthly lifecycle — 20 states

These states appear inside onboarding Review, Today, Plan history or Me. They do
not create new public routes and never expose raw prompts/provider output.

| ID | Parent | Required meaning and action |
| --- | --- | --- |
| LIFE-01 | Review/Me | Authoritative eligibility and entitlement checking |
| LIFE-02 | Review | First-plan gift available before reservation |
| LIFE-03 | Review | Atomic gift reservation in progress; duplicate action blocked |
| LIFE-04 | Review | Gift reserved; exact scope is one combined monthly plan |
| LIFE-05 | Review | Gift unavailable/exhausted; existing reservations unaffected |
| LIFE-06 | Review | Sticky Iranian account version (`product_region=ir`); FA+IRR; generation and gift remain available; IP change does not switch version |
| LIFE-07 | Review | Safety blocked with human/urgent path as appropriate |
| LIFE-08 | Review/Me | Add payment method to receive the first-plan gift, or subscribe to the single offer; no tier comparison |
| LIFE-09 | Me | Subscription active and next eligible boundary visible |
| LIFE-10 | Me | Grace/payment pending; recovery CTA, no provider start |
| LIFE-11 | Me | Cancelled/expired; history remains readable, future cycle blocked |
| LIFE-12 | Review/Today | Wait screen; job queued; leave-and-return; no duplicate job |
| LIFE-13 | Review/Today | Wait screen with rotating copy and progress; 3-minute timeout then error+retry |
| LIFE-14 | Review/Today | Same wait screen while schema/catalog/safety validation runs |
| LIFE-15 | Review/Today | Same wait screen while atomic import runs; prior plan remains active |
| LIFE-16 | Today/Plan | Ready: `ready_at` visible, one immutable version active |
| LIFE-17 | Review/Me | `needs_input` before provider start; named field can be corrected (email confirmation vs payment method vs billing country are distinct) |
| LIFE-18 | Today/Me | Generation failed or timed out before import; queued retry; user can request again; prior plan safe |
| LIFE-19 | Today/Me | Validation failed before import; retry allowed; prior plan safe |
| LIFE-20 | Today/Me | Import failed; retry import or queued retry; prior plan safe |

## Today — 12 states

| ID | Parent | Required meaning and action |
| --- | --- | --- |
| TODAY-01 | `/app/today` | Active-day brief with one next action above the fold; optional daily check-in is quiet, not primary |
| TODAY-02 | `/app/today` | Rest day with recovery action and no failure styling |
| TODAY-03 | `/app/today` | No plan; correct onboarding/entitlement action |
| TODAY-04 | `/app/today` | Same generation wait; leave allowed; after 3 minutes timeout + retry |
| TODAY-05 | `/app/today` | Completed day with reversible log access |
| TODAY-06 | `/app/today` | Partially completed timeline and updated next action |
| TODAY-07 | `/app/today` | Offline cached plan with last-sync time |
| TODAY-08 | `/app/today` | Stale plan data and conflict-safe disabled mutations |
| TODAY-09 | `/app/today` | Recoverable dashboard load error; stored plan safety stated |
| TODAY-10 | `/app/today` | Safety pause; no pressure to preserve streak |
| TODAY-11 | `/app/today` | Optional quiet daily check-in sheet; not a primary CTA |
| TODAY-12 | `/app/today` | Optional daily check-in saved; no AI; monthly plan unchanged |

## Plan — 14 states

| ID | Parent | Required meaning and action |
| --- | --- | --- |
| PLAN-01 | `/app/plan` Week | Current week and day selected |
| PLAN-02 | `/app/plan` Nutrition | Monthly nutrition structure and meal options |
| PLAN-03 | `/app/plan` Training | Monthly training structure and workout days |
| PLAN-04 | `/app/plan` Grocery | Grouped list, completion and offline-safe behavior |
| PLAN-05 | `/app/plan` Calendar | Locale/calendar-safe period and scheduled items |
| PLAN-06 | `/app/plan` | Plan version, source cycle, effective interval and readable changes |
| PLAN-07 | `/app/plan` | Empty/no active plan with one valid action |
| PLAN-08 | `/app/plan` | Loading skeleton matching final content geometry |
| PLAN-09 | `/app/plan` | Offline cached/read-only version with last-sync time |
| PLAN-10 | `/app/plan` | Load error preserving access to last cached version |
| PLAN-11 | `/app/plan` meal detail | In-page/sheet detail, recipe, provenance and alternatives |
| PLAN-12 | `/app/plan` workout detail | In-page/sheet sets, reps, rest, equipment and adaptations |
| PLAN-13 | `/app/plan` substitution | Governed alternatives with deterministic consequence summary |
| PLAN-14 | `/app/plan` history/diff | Immutable prior versions and human-readable cycle diff |

## Daily execution — 10 states

| ID | Parent | Required meaning and action |
| --- | --- | --- |
| EXEC-01 | Today/Plan meal | Meal ready; selected option and completion action |
| EXEC-02 | Today/Plan meal | Meal completed; reversal and downstream impact explained |
| EXEC-03 | Today/Plan meal | Meal substitute sheet and saved selection |
| EXEC-04 | Today/Plan workout | Workout ready, equipment/time/intensity preview |
| EXEC-05 | Today/Plan workout | In progress with current exercise, set, rest and pause |
| EXEC-06 | Today/Plan workout | Skip/substitute exercise with deterministic reason/options |
| EXEC-07 | Today/Plan workout | Paused and resumable without progress loss |
| EXEC-08 | Today/Plan workout | Pain caution: adapt/stop choices, no diagnosis |
| EXEC-09 | Today/Plan workout | Urgent symptom boundary and safe-stop action |
| EXEC-10 | Today/Plan workout | Finished/saving/save-error panels; local progress preserved |

## Progress — 7 states

| ID | Parent | Required meaning and action |
| --- | --- | --- |
| PROG-01 | `/app/progress` | Four-week overview; bold optional weekly report CTA |
| PROG-02 | `/app/progress` | Chart detail with text summary and equivalent data table |
| PROG-03 | `/app/progress` | Insufficient data/empty state without judgment; weekly CTA is the emphasis |
| PROG-04 | `/app/progress` | Offline/stale summary with visible covered period |
| PROG-05 | `/app/progress` | Optional but prominent weekly general report; no AI; current month unchanged |
| PROG-06 | `/app/progress` | Weekly result: continue/caution/professional referral |
| PROG-07 | `/app/progress` | Last-week report + informed next-month; gift users start checkout here; optional next-cycle note |

## Me, settings and account data — 9 states

| ID | Route / form | Required meaning and action |
| --- | --- | --- |
| ME-01 | `/app/me` | Minimal hub: identity, profile, subscription, export/delete, appearance, language, install-if-needed, sign-out. No “Private” badge or privacy-theater copy. Plan history (ME-05) and help/legal (ME-08) stay reachable, not duplicated as hub marketing. |
| ME-02 | `/app/settings` profile/preferences | Editable goals, food/training, measurements and next-cycle impact |
| ME-03 | `/app/settings` locale/appearance | Sticky `product_region` (read-only), calendar, units, Light/Dark and accessibility; locale follows region; no technical direction labels |
| ME-04 | `/app/settings` notifications | Permission status, channel choices and denied-settings recovery |
| ME-05 | `/app/me` subscription/history | One subscription, renewal/cancel states and immutable plan history |
| ME-06 | `/app/account` export | Request, pending, ready/expired download and failure guidance |
| ME-07 | `/app/account` delete | Consequence review, confirmation, pending and completion/error |
| ME-08 | `/app/me` help/safety/legal | Help, safety boundary, privacy/terms links and urgent resources |
| ME-09 | `/app/me` sign-out | Current/all-device choice, confirmation and recoverable failure |

## Orthogonal coverage matrix

Every semantic state must be verified against this matrix even when Penpot uses
a coverage board rather than duplicating every frame.

| Dimension | Required coverage |
| --- | --- |
| Locale | Persian and English copy; logical layout; mixed email/time/measurement isolation |
| Appearance | Light and Dark; increased-contrast behavior remains inside these modes |
| Compact | 320px minimum validation; 390px reference frame; safe areas included |
| Medium | 768px reference for rail/forms/table adaptation |
| Expanded | 1440px reference frame; bounded content width and sidebar behavior |
| Text | 200% browser zoom/reflow and product maximum supported text scale |
| Input | Keyboard-only, touch, pointer and screen-reader semantics |
| Preferences | Reduced motion, reduced transparency, increased contrast and forced colors where supported |
| Network | Online, offline cached, stale, slow and recoverable failure behavior where relevant |

Penpot must show compact and expanded compositions for every shell and complex
task. Medium-specific composition is required for navigation changes, dense
forms, charts and data tables. Storybook is the exhaustive matrix runner for all
132 IDs across locale, appearance and relevant widths.

## Eight required clickable prototype flows

| Flow | Start → terminal state | Mandatory branches |
| --- | --- | --- |
| FLOW-01 Acquisition | `PUB-01` → `AUTH-07` → `AUTH-11` → `AUTH-15` | compact menu, Iranian vs international version, sign-in return |
| FLOW-02 First plan | `ONB-01` → Basics → Health → Consent → Goal → Food → Training → Body → Review → `LIFE-08` payment method → `LIFE-16` → `TODAY-01` | resume, validation, safety block, missing payment method, gift unavailable, generation failure |
| FLOW-03 App navigation | `TODAY-01` → Plan → Progress → Me → Settings/Account → Today | compact bottom chrome, expanded sidebar, focus/selected state |
| FLOW-04 Daily use | `TODAY-01` → meal/check-in completion → `TODAY-05/06` | offline/stale, undo, caution result |
| FLOW-05 Workout | `EXEC-04` → `EXEC-05` → `EXEC-10` | pause/resume, skip/substitute, pain caution, urgent safe stop, save error |
| FLOW-06 Weekly progress | `PROG-01` → `PROG-05` → `PROG-06` → `PROG-07` | table alternative, insufficient data, caution/referral |
| FLOW-07 Account control | `ME-01` → settings/subscription/export/delete → terminal confirmation | denied notifications, cancel, export pending, destructive confirmation |
| FLOW-08 · Renewal/recovery | `PROG-07` → entitlement → generation → new `LIFE-16` | default carry-forward, optional note, inactive subscription, all three terminal failures with prior plan |

### Prototype acceptance

1. Every flow has a named start point and reaches each listed terminal outcome.
2. Every interactive control has a destination, overlay action or documented
   intentionally disabled reason; there are no orphan frames or dead ends.
3. Back, cancel, close, browser back, Escape and focus return are defined where
   relevant and never discard confirmed data silently.
4. The primary happy path is clickable in Persian compact Light and English
   expanded Dark. Branch panels reference the same semantic IDs.
5. No prototype label exposes `RTL`, `LTR`, provider names, raw prompts, raw model
   errors or a coach/chat persona.
6. Glass is limited to functional navigation and temporary overlays. Forms,
   content cards, alerts, plan rows and health information remain opaque.

## Design Complete definition of done

The product may be labeled **Design Complete** only when all conditions hold:

- all 132 IDs are present in the Penpot screen/state index and Storybook coverage
  report, with no `TBD`, duplicate meaning or undocumented route;
- all eight clickable flows pass the prototype acceptance criteria;
- reusable components use instances/variants and semantic tokens rather than
  redrawn one-off controls;
- public, auth, onboarding, all four app destinations, execution, lifecycle,
  settings, export and deletion have responsive compositions and recovery states;
- Persian/English, Light/Dark, compact/medium/expanded, long copy, Persian digits,
  dates, times and units have recorded evidence;
- target size, centered icon/text alignment, focus, reading order, announcements,
  text scaling, chart alternatives and preference fallbacks are reviewed;
- monthly generation, one subscription, dynamic gift, `ready_at`, previous-plan
  preservation and no-chat/no-extra-call rules are visually and textually exact;
- PRD, this ledger, Blueprint, Traceability, Penpot and Storybook use the same IDs
  and resolve all contradictions;
- a final owner review records defects and closes them before the production-code
  lock is lifted.
