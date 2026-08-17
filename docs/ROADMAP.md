# Momentum delivery roadmap

Version: 1.4
Last reviewed: 2026-08-17
Planning model: stage-gated; dates follow evidence and capacity, not the reverse

> This roadmap describes intended sequencing, not a promise that a feature is live. A phase is complete only when its exit criteria pass.

## اولویت‌بندی فارسی

ترتیب اجرای محصول:

1. مرز حقوقی، ایمنی، eligibility کشور و مدل داده؛
2. حساب کاربری، دیتابیس سمت سرور و دوزبانگی؛
3. بازتنظیم کامل سیستم بصری با اصول طراحی اپل و انتخاب پالت رنگ تازه؛
4. برنامه، ثبت و پیگیری بدون وابستگی به AI؛
5. یک تولید و import خودکار برنامهٔ تمرین و تغذیه در هر دورهٔ ماهانه، فقط در بازارهای مجاز، همراه پرداخت نازک (روش پرداخت، کشور صورتحساب، شارژ چرخهٔ دوم)؛
6. hardening، ارزیابی حرفه‌ای و public beta؛
7. hardening کامل پرداخت (مالیات، dunning) پس از اثبات operations؛
8. گسترش قابلیت‌ها و بازارها.

مسیر ایران مستقل و بدون تاریخ انتشار است. تا زمان مجوز کتبی provider و تأیید حقوقی، AI و قیمت ایرانی غیرفعال می‌مانند.

## Guiding sequence

```text
Policy and evidence
  -> identity and server data
  -> deterministic product loop
  -> bounded AI in supported markets plus thin payments (method, billing country, cycle-2 charge)
  -> safety/security/economic hardening
  -> public beta
  -> payment hardening (tax, dunning)
  -> controlled expansion
```

## Phase overview

| Phase | Outcome | Status definition |
| --- | --- | --- |
| 0. Product and business baseline | Founder-approved product contract, economics, architecture, and recorded launch gates | Complete when canonical documents agree; professional/legal gates may remain open for launch |
| 1. Complete product design | Apple-aligned system plus all 132 semantic states, eight flows, Storybook and AI-readable handoff | Complete only after the Design Complete gate and owner sign-off |
| Implementation foundation — after design sign-off | Accounts, server data, authorization, bilingual shell | Frozen until the approved Penpot/Storybook contract is ready |
| 2. Deterministic product core | Usable plans, logs, check-ins, export without AI dependency | Complete after end-to-end product loop |
| 3. Monthly AI plan generation | One validated combined plan import per entitled monthly period, with payment method and billing-country verification before the first provider call | Complete after period/idempotency/eval/provider gates and 5a |
| 4. Public-beta hardening | Reliable, observable, recoverable, professionally reviewed product | Complete after all launch gates |
| 5. Monetization | **5a** with Phase 3: method collection, cycle-2 charge, cancel. **5b** later: tax, dunning, experiments | 5b deferred until operations are proven |
| 6. Expansion | Integrations, richer planning, B2B/human services | Separate discovery and approvals |
| Product region | Sticky `ir` (FA+IRR) vs `intl` (EN+USD) | D12; IP writes once at signup |

## Phase 0 — Product, business, architecture, and safety baseline

**Status: Complete — founder-approved 2026-08-13.** Professional, legal,
provider, payment, and market approvals remain explicit later launch gates.

### Deliverables

- bilingual public PRD;
- monetization and unit-economics hypothesis;
- metrics and event specification;
- safety and launch policy;
- staged roadmap and operations runbook;
- official source register with review date;
- conceptual data model and ownership boundaries;
- sticky product region (`ir` FA+IRR / `intl` EN+USD) recorded as D12;
- decision to use PostgreSQL/Supabase for MVP, subject to implementation review.

### Exit criteria

- founder approves the product contract and D1–D13;
- unresolved professional, legal, provider, payment, and market questions are
  explicitly recorded as implementation/launch gates rather than product ambiguity;
- no document describes an in-product Iran geo-block;
- claims clearly separate source-backed facts from Momentum hypotheses.

## Implementation foundation — sequenced kickoff 2026-08-17

Owner opened coding-agent work via
[AGENT-DEVELOPMENT-PLAN.md](./AGENT-DEVELOPMENT-PLAN.md). Step 5 freeze is
[signed 2026-08-18](./design/STEP-5-FREEZE.md); agents implement in slices and must not copy D1–D13 drift.

### Objectives

- replace device-only state with account-bound server state;
- provide secure identity and authorization;
- establish Persian and English product foundations;
- make geographic/provider eligibility server-authoritative.

### Deliverables

- Supabase projects separated by environment;
- production-ready email/password or approved passwordless auth;
- verified email, recovery, sign-out, session revocation, and account deletion request;
- PostgreSQL migrations for profile, consent, eligibility, goals, measurements, catalogs, plans, logs, entitlements, AI metadata, and privacy requests;
- RLS on every exposed user-owned table;
- private storage design for future sensitive media;
- server-side country/provider eligibility policy;
- i18n dictionary, automatic writing-direction behavior, and locale/unit/cuisine separation without technical direction labels in UI;
- data import decision for any legacy device state, without silently uploading data;
- audit fields, idempotency keys, and structured error contract.

### Exit criteria

- automated cross-user authorization tests pass with zero access;
- no service-role or OpenAI secret appears in client assets;
- account recovery and deletion request work end to end;
- direct API attempts cannot bypass age/consent/country controls;
- Persian and English auth/onboarding shells pass visual and accessibility checks;
- backup exists and a restore test is documented.

## Phase 1 — Complete Apple-aligned product design

### Objectives

- replace the current color palette before expanding authenticated product screens;
- use Apple Human Interface Guidelines as the interaction and hierarchy reference while preserving Momentum's own identity;
- keep controls compact, content-first, optically centered, touch-safe, and native-feeling;
- support Persian and English without presenting writing-direction terminology to users.
- compose the complete product rather than stopping at isolated components;
- freeze an implementation-ready behavioral/design contract before production code changes.

### Deliverables

- moodboard and three candidate palettes evaluated in Light and Dark
  appearances — **complete**;
- founder-approved **Human Strength — Deep Plum + Apricot** direction and
  functional Liquid Glass contract — **complete**;
- semantic color tokens for background, grouped surfaces, labels, fills, separators, tint, status, focus, and charts;
- typography, spacing, corner, material, shadow, icon-slot, control-height, and motion contracts;
- redesigned navigation, forms, sheets, alerts, segmented controls, lists, cards, and empty/loading states;
- clean Penpot foundations/components followed by every composed product screen
  and branch in the canonical 132-state Inventory;
- eight clickable prototypes with complete Back/Cancel/error/safety/recovery paths;
- exhaustive deterministic Storybook component and screen fixtures with shared
  state IDs, locale/theme and responsive coverage;
- PRD, Inventory, Blueprint, Traceability and architecture/design handoff aligned
  so an implementation agent does not infer missing routes or business logic;
- bilingual content-expansion and mixed-number/date behavior documented without visible technical labels;
- deprecation map for old colors and components.

### Exit criteria

- Product and Design approve one palette in both appearances — **complete**;
- every active component uses semantic tokens instead of old hard-coded brand colors;
- Penpot and Storybook agree on geometry, state, and token naming;
- core Persian and English specimens pass visual review at mobile and desktop sizes;
- no screen proceeds to detailed product design using the superseded palette.
- all 132 IDs have Penpot and Storybook evidence with no duplicate/missing state;
- all eight prototype graphs have no orphan frame, dead end or unbound action;
- responsive, localization, material and accessibility evidence passes the
  Design Complete definition in PRD §19 and Blueprint §11;
- owner closes design defects and explicitly unlocks production implementation.

Production frontend/backend work remains frozen throughout Phase 1. Storybook is
an executable design artifact in this phase, not authorization to migrate the app.

## Phase 2 — Deterministic product core

### Objectives

Deliver value even when AI is unavailable. Saved plans and tracking remain usable during an AI outage.

### Deliverables

- governed exercise, equipment, food, ingredient, and allergen catalogs;
- deterministic unit conversion and target/constraint engine using professionally approved rules;
- manual/template-based validated starter plans;
- versioned workout and nutrition plans;
- daily plan view, substitutions, completion, and notes;
- daily/weekly check-ins and trend summaries;
- progress dashboard with neutral, non-stigmatizing language;
- export/print from stored plan data;
- portable data download and deletion workflow;
- event taxonomy with sensitive-field filtering;
- accessibility, timezone, and unit conversion coverage.

### Exit criteria

- a user can onboard, receive a non-AI valid plan, log progress, check in, and export;
- unknown catalog IDs and allergen conflicts cannot be saved as active plans;
- saved plans remain usable with AI disabled;
- professional reviewers approve the rule/catalog baseline;
- core product metrics can be computed without raw health data in analytics.

## Phase 3 — Monthly AI plan generation in supported markets only

### Objectives

Generate and automatically import one combined workout-and-nutrition plan per entitled monthly period. AI is not a conversational feature and never appears as a coach persona.

### Deliverables

- backend-only OpenAI integration using the current approved Responses API path;
- one planning model for the user's only monthly AI call and complete combined-plan output;
- versioned prompt, schema, and model configuration;
- Structured Outputs for combined monthly plans;
- month-one context from onboarding and month-two-plus context from onboarding plus the prior-period outcome snapshot;
- cache strategy measured by net savings, not hit rate alone;
- status-driven generation at the start of the new cycle; it is not generated
  early and does not require a 24-hour batch window;
- input/output moderation and product-specific safety rules;
- deterministic catalog, unit, constraint, and policy validators;
- deterministic local-normalization/fail-closed flow with no second model call;
- exactly one generation reservation per monthly plan cycle, idempotency, rate limits, cost ledger, and circuit breaker;
- server-owned first-plan gift configuration with campaign switch, total budget,
  conservative atomic reservation, allowed markets, reconciliation, and a
  budget-exhausted fallback to Preview/subscription;
- reviewed catalog `momentum-core@v2` as the generation gate (D10);
- thin payments 5a: payment-method collection, first charge at cycle 2, cancel;
- active-subscription verification before month two and every later period;
- automatic import only after validation, with prior plan preserved on failure;
- pseudonymous safety identifiers and `store: false` where supported;
- sticky `product_region` on every job; later IP does not switch version.

### Exit criteria

- Persian and English quality/safety eval suites pass;
- zero severe unsafe outputs in the human-reviewed launch suite;
- zero disqualifying profile receives an automated plan;
- no invalid schema or catalog item reaches the UI;
- p95 costs remain within the single paid-plan envelope under load and retry tests;
- provider outage and malformed output fail safely;
- unsupported-country bypass tests pass.
- no chat, coach route, message store, composer, or turn quota exists in product or API contracts.

## Phase 4 — Public-beta hardening

### Objectives

Turn a working system into an operable public product.

### Deliverables

- threat model, privacy review, dependency/secret scanning;
- backup schedule, restore drill, rollback and kill switches;
- dashboards and alerts for auth, database, AI, safety, cost, and eligibility;
- incident response and bilingual support macros;
- licensed exercise/nutrition review of rules, examples, and escalation copy;
- terms, privacy, consent, retention, disclaimer, and country list;
- first-plan gift abuse prevention;
- load, accessibility, mobile, writing-direction, mixed-content, and browser testing;
- closed alpha, then supported-country public beta with controlled cohort size;
- weekly safety sampling and cost review.

### Exit criteria

- every applicable launch gate in `docs/product/SAFETY_AND_LAUNCH_POLICY.md` is signed;
- P0/P1 incident simulation succeeds;
- restore, rollback, AI kill switch, and eligibility kill switch are tested;
- Safe Activation, plan validation, cost, and support baselines meet approved thresholds;
- there is an explicit country allowlist for the public beta.

## Phase 5 — Monetization and payments

D9 splits this phase. **5a is a Phase 3 prerequisite**, not a post-retention
deferral: without a payment method, the public self-serve gift cannot charge at
cycle 2. **5b** remains later hardening. Do not treat pricing cards as
permission to ship 5b.

### Phase 5a — required with generation (D8, D9)

- payment-method collection (`SetupIntent` / $0 authorization);
- first charge at cycle 2 for the one Momentum subscription;
- cancel; history remains readable (D3);
- list currency from sticky `product_region` (IRR or USD);
- `admin_review` remains support-only.

### Phase 5b — later hardening

### Preconditions for 5b

- safe activation and W4 retention show repeat value;
- actual AI/infra p95 cost supports at least 70% contribution margin;
- legal entity, consumer terms, tax, refund, and payment processing are approved;
- support can handle cancellations, refunds, disputes, and account recovery;
- webhook and entitlement designs are idempotent and auditable.

### Deliverables for 5b

- one monthly/annual subscription checkout polish for both product versions;
- grace period, retry, refund, and access-expiry behavior;
- pricing localization by sticky `product_region` (USD vs IRR);
- invoices/receipts and tax treatment;
- revenue, refund, COGS, and contribution dashboards;

### Exit criteria for 5b

- purchase-to-entitlement and cancellation-to-access tests pass;
- duplicate/out-of-order webhook tests pass;
- refund and dispute runbooks are ready;
- p95 net contribution margin meets guardrail;
- pricing claims and renewals are transparent in both languages.

## Phase 6 — Controlled expansion

Each item needs separate discovery, risk analysis, and success criteria:

- Apple Health / Health Connect and wearable imports;
- meal photo assistance with explicit consent and uncertainty;
- movement video feedback;
- voice coaching;
- licensed human review add-on;
- coach/clinic portal;
- B2B gym or employer wellness;
- additional languages and food markets;
- family/minor experiences;
- regulated or clinical workflows.

Clinical, minor, employer, insurer, or provider workflows are not simple feature flags. They can change the legal and safety classification of the product and infrastructure.

## Product region — two versions, no geo-block

### Current state

D12 serves both versions. `ir` is Persian + IRR. `intl` is English + USD. IP
writes `product_region` once at signup.

### Operator checklist before live production AI

- provider contract for the chosen model;
- payment entity and consumer terms for USD and IRR lists;
- health-data privacy and transfer assessment;
- signed enablement of the live provider switch.

VPNs and later IP changes must not switch a stored `product_region`. They are
not a circumvention path because region is not an AI gate.

## Cross-phase definition of done

A capability is done only when:

- user experience works in Persian and English where applicable;
- authorization, privacy, safety, cost, and eligibility controls are server-side;
- tests and observability exist;
- failure and rollback behavior are defined;
- documentation and source review are current;
- the owner accepts operational responsibility;
- no active launch blocker applies.
