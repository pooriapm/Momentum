# Momentum delivery roadmap

Version: 1.0
Last reviewed: 2026-07-31
Planning model: stage-gated; dates follow evidence and capacity, not the reverse

> This roadmap describes intended sequencing, not a promise that a feature is live. A phase is complete only when its exit criteria pass.

## اولویت‌بندی فارسی

ترتیب اجرای محصول:

1. مرز حقوقی، ایمنی، eligibility کشور و مدل داده؛
2. حساب کاربری، دیتابیس سمت سرور و دوزبانگی؛
3. برنامه، ثبت و پیگیری بدون وابستگی به AI؛
4. تولید و گفت‌وگوی AI فقط در بازارهای مجاز؛
5. hardening، ارزیابی حرفه‌ای و public beta؛
6. پرداخت پس از اثبات retention و unit economics؛
7. گسترش قابلیت‌ها و بازارها.

مسیر ایران مستقل و بدون تاریخ انتشار است. تا زمان مجوز کتبی provider و تأیید حقوقی، AI و قیمت ایرانی غیرفعال می‌مانند.

## Guiding sequence

```text
Policy and evidence
  -> identity and server data
  -> deterministic product loop
  -> bounded AI in supported markets
  -> safety/security/economic hardening
  -> public beta
  -> payments
  -> controlled expansion
```

## Phase overview

| Phase | Outcome | Status definition |
| --- | --- | --- |
| 0. Product and safety baseline | Decisions, sources, architecture, launch gates | Complete when cross-functional review accepts docs |
| 1. Platform foundation | Accounts, server data, authorization, bilingual shell | Complete after auth/RLS/i18n/security tests |
| 2. Deterministic coaching core | Usable plans, logs, check-ins, export without AI dependency | Complete after end-to-end product loop |
| 3. AI coaching, supported markets | Structured plan generation and coach with cost/safety controls | Complete after bilingual evals and provider eligibility |
| 4. Public-beta hardening | Reliable, observable, recoverable, professionally reviewed product | Complete after all launch gates |
| 5. Monetization | Trial, checkout, subscription lifecycle, regional pricing | Deferred until value and operations are proven |
| 6. Expansion | Integrations, richer coaching, B2B/human services | Separate discovery and approvals |
| Iran readiness track | Legally and contractually permitted service | No-Go until every Iran gate passes |

## Phase 0 — Product, architecture, and safety baseline

### Deliverables

- bilingual public PRD;
- monetization and unit-economics hypothesis;
- metrics and event specification;
- safety and launch policy;
- staged roadmap and operations runbook;
- official source register with review date;
- conceptual data model and ownership boundaries;
- OpenAI country restriction recorded as an active blocker for Iran;
- decision to use PostgreSQL/Supabase for MVP, subject to implementation review.

### Exit criteria

- Product, Engineering, Design, Safety, and Legal owners identified;
- open decisions have owners and due dates;
- no document implies AI availability in Iran;
- claims clearly separate source-backed facts from Momentum hypotheses.

## Phase 1 — Platform foundation

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
- i18n dictionary, RTL/LTR layout, locale/unit/cuisine separation;
- data import decision for any legacy device state, without silently uploading data;
- audit fields, idempotency keys, and structured error contract.

### Exit criteria

- automated cross-user authorization tests pass with zero access;
- no service-role or OpenAI secret appears in client assets;
- account recovery and deletion request work end to end;
- direct API attempts cannot bypass age/consent/country controls;
- Persian and English auth/onboarding shells pass visual and accessibility checks;
- backup exists and a restore test is documented.

## Phase 2 — Deterministic coaching core

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

## Phase 3 — AI coaching in supported markets only

### Objectives

Add cost-controlled personalization and conversation without making AI the authority for identity, eligibility, calculations, or safety.

### Deliverables

- backend-only OpenAI integration using the current approved Responses API path;
- model router: Luna for routine/extraction/summary, Terra for plans, Sol only for proven exceptions;
- versioned prompt, schema, and model configuration;
- Structured Outputs for plans and state updates;
- bounded context builder with structured summaries;
- cache strategy measured by net savings, not hit rate alone;
- asynchronous Flex/Batch-rate jobs where latency permits;
- input/output moderation and product-specific safety rules;
- deterministic catalog, unit, constraint, and policy validators;
- repair/fail-closed flow;
- per-user quota, idempotency, rate limits, cost ledger, and circuit breaker;
- pseudonymous safety identifiers and `store: false` where supported;
- provider allowlist checked for every job;
- no Iran AI requests, trials, entitlements, or checkout.

### Exit criteria

- Persian and English quality/safety eval suites pass;
- zero severe unsafe outputs in the human-reviewed launch suite;
- zero disqualifying profile receives an automated plan;
- no invalid schema or catalog item reaches the UI;
- p95 costs remain within Core/Pro envelopes under load and retry tests;
- provider outage and malformed output fail safely;
- unsupported-country bypass tests pass.

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
- trial abuse prevention;
- load, accessibility, mobile, RTL/LTR, and browser testing;
- closed alpha, then supported-country public beta with controlled cohort size;
- weekly safety sampling and cost review.

### Exit criteria

- every applicable launch gate in `docs/product/SAFETY_AND_LAUNCH_POLICY.md` is signed;
- P0/P1 incident simulation succeeds;
- restore, rollback, AI kill switch, and eligibility kill switch are tested;
- Safe Activation, plan validation, cost, and support baselines meet approved thresholds;
- there is an explicit country allowlist for the public beta.

## Phase 5 — Monetization and payments

Payment execution is deliberately deferred. Do not integrate payment merely because pricing cards exist.

### Preconditions

- safe activation and W4 retention show repeat value;
- actual AI/infra p95 cost supports at least 70% contribution margin;
- legal entity, consumer terms, tax, refund, and payment processing are approved;
- support can handle cancellations, refunds, disputes, and account recovery;
- webhook and entitlement designs are idempotent and auditable.

### Deliverables

- account-gated seven-day trial;
- Core and Pro monthly/annual checkout in approved international markets;
- server-owned subscription and entitlement state;
- idempotent signed webhook processing;
- grace period, retry, cancellation, refund, and access-expiry behavior;
- pricing localization by verified billing country, independent of language;
- invoices/receipts and tax treatment;
- revenue, refund, COGS, and contribution dashboards;
- no Iran AI payment path until the Iran track independently passes.

### Exit criteria

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

## Iran readiness track — unscheduled and blocked

### Current state

OpenAI-powered functionality and Iranian paid AI pricing are **disabled**.

### Required evidence before scheduling implementation

- written authorization from the chosen AI provider for serving end users in Iran;
- external legal opinion covering sanctions/export controls and the proposed corporate/payment path;
- health-data privacy and cross-border processing approval;
- payment-provider and consumer-contract approval;
- technical eligibility design and abuse/bypass test plan;
- signed executive risk acceptance.

### Only after evidence exists

- revalidate provider prices, data retention, and supported capabilities;
- revalidate proposed toman/IRR prices against settlement and p95 COGS;
- run Persian professional review and local-food safety testing;
- conduct a limited legally approved pilot;
- issue a separate Go/No-Go record.

VPNs, proxies, a server in another country, competitor availability, or a successful API request do not advance this track.

## Cross-phase definition of done

A capability is done only when:

- user experience works in Persian and English where applicable;
- authorization, privacy, safety, cost, and eligibility controls are server-side;
- tests and observability exist;
- failure and rollback behavior are defined;
- documentation and source review are current;
- the owner accepts operational responsibility;
- no active launch blocker applies.
