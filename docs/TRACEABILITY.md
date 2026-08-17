# Momentum requirement traceability matrix

Version: 1.3  
Last reviewed: 2026-08-17  
Status: implementation evidence still pending except chrome/Me/form alpha notes in [HANDOFF](./design/HANDOFF.md)  
Rule: a row is not complete until product, design, code and verification evidence agree.

## Evidence keys

- Product: [PRD](./product/PRD.md), [Phase 0 Contract](./product/PHASE-0-PRODUCT-CONTRACT.md)
- Inventory: [Screen and State Inventory](./product/SCREEN-STATE-INVENTORY.md)
- Design: [Handoff](./design/HANDOFF.md), [Product Flows](./design/product-flows.md), [Components](./design/components.md),
  [Localization](./design/localization.md), [Accessibility](./design/accessibility.md),
  [Visual Direction](./design/visual-direction.md), Penpot and Storybook
- Architecture: [API Contracts](./architecture/api-contracts.md),
  [Data Model](./architecture/data-model.md), [AI Architecture](./architecture/ai-architecture.md)
- Control: [Threat Model](./security/threat-model.md), [RLS](./security/rls.md),
  [Operations](./OPERATIONS.md), [Safety Policy](./product/SAFETY_AND_LAUNCH_POLICY.md)
- Agent sequencing: [Development plan](./AGENT-DEVELOPMENT-PLAN.md)

State IDs are the join key. Penpot frame/state names and Storybook
story parameters/docs must include the applicable ID; a screenshot or story count
without IDs is not traceability evidence.

## State-family coverage contract

| IDs | Canonical UI parent | Penpot composition area | Required Storybook evidence | Architecture owner |
| --- | --- | --- | --- | --- |
| `PUB-01`–`PUB-14` | localized public routes | Public | one fixture per ID + locale/theme/width matrix | geo hints, pricing display, legal content |
| `AUTH-01`–`AUTH-18` | `/auth/:mode` | Auth | form, loading, recovery and token states | Auth/session/rate limit |
| `ONB-01`–`ONB-28` | `/onboarding` and eight step routes | Onboarding | resumable steps, conditional controls, save/conflict | drafts, consent, safety/eligibility |
| `LIFE-01`–`LIFE-20` | Review/Today/Me in-page states | Lifecycle | gate, subscription, job, terminal failure fixtures | entitlement, usage, provider job, import |
| `TODAY-01`–`TODAY-12` | `/app/today` | Product app / Today | active/rest/empty/offline/stale/safety/error/check-in | dashboard/local day/cache |
| `PLAN-01`–`PLAN-14` | `/app/plan` | Product app / Plan | five views, details, substitution, history/failure | immutable plans/catalogs |
| `EXEC-01`–`EXEC-10` | Today/Plan overlays | Daily execution | meal and full workout state machine | owner-bound meal/workout RPCs |
| `PROG-01`–`PROG-07` | `/app/progress` | Product app / Progress | chart/table, empty/offline/check-in/next cycle | aggregates/check-ins/snapshot |
| `ME-01`–`ME-09` | Me/Settings/Account | Account | hub/settings/subscription/export/delete/sign-out | profile/entitlement/privacy/session |

The coverage total is exactly **132**, not counting locale, appearance, viewport
or component-interaction permutations.

## Product and domain

| ID | Normative requirement | Design evidence | Architecture/control evidence | Required verification | Implementation evidence |
| --- | --- | --- | --- | --- | --- |
| R-001 | Exactly four app destinations: Today, Plan, Progress, Me | Product Flows, Penpot navigation, AppChrome story | Blueprint §3 | Route/navigation E2E in FA/EN and compact/expanded | Pending |
| R-002 | No AI coach/chat/composer/message destination or API | All screens and component inventory omit it | AI Architecture; API Contracts | route/schema/database grep + negative API tests | Pending |
| R-003 | One paid subscription; no Core/Pro tiers | Pricing/Offer screens and stories | Monetization; Blueprint §2 | pricing snapshot + offer API contract test | Pending |
| R-004 | Dynamic first-plan gift with atomic total-budget reservation | Gift available/exhausted/checking/ineligible states | Data Model; Operations | concurrent reservation, exhaustion, reconciliation and abuse tests | Pending |
| R-005 | Gift exhaustion never revokes an existing reservation or saved plan | Gift exhausted state | Phase 0 D1; API failure policy | race and regression tests | Pending |
| R-006 | Cycle starts from successful import `ready_at`, not a calendar boundary | Plan-ready, Plan status/history | Data Model; AI Architecture | timezone/DST/import-boundary integration tests | Pending |
| R-007 | Cycle two+ requires active server-verified subscription | Subscription gate, renewal states | API Contracts; Data Model | active/grace/pending/cancelled/expired matrix | Pending |
| R-008 | At most one successfully imported plan per user/cycle; one in-flight queued job | Wait screen LIFE-12–15; timeout+retry LIFE-18 | AI Architecture; usage ledger | concurrency, replay, timeout and distinct-key tests prove ≤1 imported | Pending |
| R-009 | Before import, same-job queue retry with delay; after import, no second model call | LIFE-18/19 timeout/error + retry CTA | AI Architecture; Operations | injected provider/schema/import failures | Pending |
| R-010 | Previous valid plan remains visible on all renewal failures/cancellation | Plan history and failure states | Data Model; Blueprint §8 | end-to-end plan preservation suite | Pending |
| R-011 | Weekly general reports store mid-cycle input; no mid-month AI | PROG-05/06 | Phase 0 D13 | weekly save, no AI, current month unchanged | Pending |
| R-012 | No early generation; no action follows default carry-forward | Cycle-ready states | Phase 0 D5 | clock-controlled boundary tests | Pending |
| R-013 | Body composition uses manual/non-generative input and confirmation only | Composition onboarding/review | AI Architecture; RLS | no AI route; normalization/range/source tests | Pending |
| R-014 | Plans are versioned, visible, explainable and exportable | Plan summary/history/export | Data Model; API Contracts | immutable digest/version and export tests | Pending |
| R-024 | Payment method before first provider call; no charge until cycle 2 | LIFE-08, ONB-27, pricing | Phase 0 D8; Monetization | SetupIntent, no charge until cycle 2 | Pending |
| R-025 | Allergies are a governed catalog picker; unmapped free text does not 409 generation | ONB-09/13/14 | Phase 0 D11; catalog contract | picker, other-blocks, generated-meal allergen fail-closed | Pending |
| R-026 | Public generation requires reviewed catalog `momentum-core@v2` | Plan/nutrition stories | Phase 0 D10; data model | empty/v1 seed cannot serve public generation | Pending |
| R-027 | Sticky `product_region` (`ir` FA+IRR / `intl` EN+USD); IP writes once; no geo-block | PUB-04/05/10, LIFE-06, ME-03 | Phase 0 D12 | signup lock, later-IP no-op, geo-context authenticated path | Pending |
| R-028 | One monthly plan; wait screen with 3-minute timeout; daily slice; optional quiet daily / bold weekly report | LIFE-12–16, TODAY-04/11, PROG-05/07 | Phase 0 D13 | days≈month, queue retry, gift→checkout from last weekly | Pending |

## Journeys and components

| ID | Normative requirement | Design evidence | Architecture/control evidence | Required verification | Implementation evidence |
| --- | --- | --- | --- | --- | --- |
| R-101 | Public routes cover landing, how, pricing, safety, privacy, terms | Public Penpot screens + page stories | Blueprint §3.1 | locale route and metadata E2E | Pending |
| R-102 | Auth covers sign-up, sign-in, verification and recovery with full states | Auth Penpot + Field/Button/Notice stories | Auth/security contracts | keyboard, validation, expired token and recovery tests | Pending |
| R-103 | Onboarding is resumable, URL-addressable and preserves valid input | Onboarding Penpot + StepProgress/forms stories | onboarding draft/completion contract | reload/back/offline/conflict E2E | Pending |
| R-104 | Training days fit FA/EN; Persian digits and dates render correctly | Training screen specimens | Localization | all weekday/calendar/number permutations | Pending |
| R-105 | Duration is compact dropdown/custom option; equipment is conditional | Training screen and Select/Field states | deterministic profile schema | home/gym/custom and keyboard/screen-reader tests | Pending |
| R-106 | Today prioritizes next action with required empty/loading/offline/safety states | Today screens/stories | dashboard API projection | state fixture + responsive visual tests | Pending |
| R-107 | Plan covers week/nutrition/training/grocery/calendar and detail states | Plan screens/stories | plan schema/catalog contracts | content-density, mutation and deep-link E2E | Pending |
| R-108 | Progress supplies text/table alternatives for charts | Progress screens/chart stories | metrics/privacy policy | screen-reader, no-color-only and data-equivalence tests | Pending |
| R-109 | Me covers profile, preferences, subscription/history/privacy/accessibility/legal | Me screens/stories | account/export/delete APIs | route and destructive-action confirmation tests | Pending |
| R-110 | Every async/empty/error state preserves context and offers one valid action | State matrices in Penpot/Storybook | API stable error codes | fixture-driven state coverage report | Pending |
| R-111 | Exactly 132 semantic states use canonical IDs and have Penpot + Storybook evidence | Inventory and screen index | Blueprint §3.4 | automated ID coverage/deduplication report | Pending |
| R-112 | Eight clickable prototype flows have no dead ends, orphan frames or unbound controls | Product Flows §6–7 | Blueprint §3.5 | prototype graph audit + owner walkthrough | Pending |
| R-113 | Browser paths match the canonical router; detail/lifecycle states remain within parent routes | Inventory route manifest | Router/API boundary | route-manifest E2E + docs/route diff | Pending |
| R-114 | Reusable UI is built from token-bound component instances/variants, not one-off drawings | Penpot library + Components catalog | Design handoff gate | instance/binding/variant audit | Pending |

## Design, localization and accessibility

| ID | Normative requirement | Design evidence | Architecture/control evidence | Required verification | Implementation evidence |
| --- | --- | --- | --- | --- | --- |
| R-201 | Human Strength Deep Plum + Apricot is the only active palette | Tokens, Penpot, Storybook foundations | Design conformance | token alias/contrast + obsolete-color grep | Pending |
| R-202 | Light and Dark only; no High Contrast collection | token modes and Penpot themes | Token Contract | mode enumeration and appearance snapshots | Pending |
| R-203 | Regular/Prominent/Clear glass only on functional navigation/temporary controls; localized press/drag refraction and source-linked morph; stable at rest | Penpot material anatomy and state sequences; Storybook interaction lab | Materials/Motion contracts | component allowlist + press/drag/morph + reduced-motion/transparency + performance tests | Pending |
| R-204 | Content cards/forms/alerts/health data are opaque | component screens/stories | Materials contract | computed style/visual tests | Pending |
| R-205 | Persian/English share semantics; locale controls direction | paired screens/stories | Localization | FA/EN pseudo-long/mixed-script E2E | Pending |
| R-206 | `RTL`/`LTR` are never user-facing labels | all visual surfaces | Blueprint §7 | translation/source/UI text grep | Pending |
| R-207 | Minimum 44×44 target, centered labels/icons and logical padding | component anatomy/stories | Accessibility | target-size, alignment and pointer tests | Pending |
| R-208 | Focus, screen reader, keyboard, text scaling, reduced motion/transparency | all component state stories | Accessibility/Motion | automated axe plus manual assistive-tech matrix | Pending |
| R-209 | Numbers, dates, times, units and bidi-isolated mixed values are locale-safe | localization specimens | Localization | Persian-digit/calendar/timezone/unit fixture matrix | Pending |
| R-210 | Compact 390/320-min, Medium 768 and Expanded 1440 compositions preserve task context | responsive Penpot boards and stories | Blueprint §7 | width/reflow/rotation/resize visual suite | Pending |
| R-211 | Design Complete requires 132 IDs, eight flows and owner-approved zero-blocker review | Inventory DoD; PRD §19; Blueprint §11 | documentation precedence | signed handoff checklist and defect ledger | Pending |

## Security, privacy, reliability and launch

| ID | Normative requirement | Design evidence | Architecture/control evidence | Required verification | Implementation evidence |
| --- | --- | --- | --- | --- | --- |
| R-301 | Every private resource is owner-bound and RLS-protected | privacy/error surfaces | RLS; Data Model | user-A/user-B/anon/service suite | Pending |
| R-302 | Provider/service secrets never enter client assets or logs | no key UI | Threat Model; Operations | bundle/env/log secret scanning | Pending |
| R-303 | Eligibility is server-authoritative; IP/manual country is hint only | region states | API/Data Model | bypass/conflicting-evidence tests | Pending |
| R-304 | Sticky `product_region`; later IP does not switch version; no geo-block screen | PUB-05, PUB-10, LIFE-06, ME-03 | Phase 0 D12; Country register | signup lock and geo-context tests | Pending |
| R-305 | No raw prompt, health free text, reports or plan output in general analytics | consent/privacy screens | Metrics; Threat Model | event allowlist and telemetry inspection | Pending |
| R-306 | Export/deletion covers Auth, DB, Storage and approved providers | Me privacy flows | Privacy; Retention; Operations | export completeness and deletion drill | Pending |
| R-307 | Saved plan remains available during provider outage | offline/degraded states | Operations; AI Architecture | outage/restore game-day | Pending |
| R-308 | Provider output passes schema/catalog/allergen/unit/safety validators before import | validating/failure/ready states | AI Architecture; Safety Policy | adversarial and property-based validation suite | Pending |
| R-309 | Backup/restore, reconciliation, kill switches, alerts and incident paths exist | service-status copy | Operations | staging drills with dated evidence | Pending |
| R-310 | Legal, provider and professional gates remain blocking despite completed UI | legal/safety unavailable states | Safety Policy; Terms; Go/No-Go | signed release checklist | Pending |

## Completion procedure

For each implementation pull request:

1. list affected requirement IDs;
2. link the exact Storybook stories and Penpot frames;
3. link code, migration/API schema and automated tests;
4. attach Light/Dark and Persian/English visual evidence where UI changes;
5. update the final column from `Pending` only after CI and required manual review;
6. never close a launch-gate row using implementation evidence alone.
