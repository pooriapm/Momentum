# Momentum safety and launch policy

Version: 1.0
Policy owner: Safety + Product + Legal
Last reviewed: 2026-07-31
Applies to: product, marketing, AI prompts, data, support, experiments, and release operations

This document is a product policy, not legal or medical advice. Qualified counsel and licensed health professionals must approve the relevant launch gates.

## خلاصه سیاست فارسی

- Momentum در MVP فقط برای کاربران ۱۸ سال به بالا و اهداف عمومی تناسب‌اندام است.
- محصول پزشک، متخصص تغذیه درمانی یا ابزار تشخیص نیست.
- شرایط پرخطر یا نیازمند تصمیم بالینی برنامه خودکار دریافت نمی‌کنند.
- برنامه فقط پس از اعتبارسنجی schema، catalog، قواعد قطعی و سیاست ایمنی منتشر می‌شود.
- داده سلامت خصوصی است؛ تبلیغات مبتنی بر سلامت و فروش داده ممنوع است.
- تکمیل فنی، مجوز عرضه محسوب نمی‌شود.
- **ایران launch-blocker قطعی است:** تا زمان تأیید کتبی provider و تأیید حقوقی، هیچ درخواست AI، trial AI یا فروش پلن AI برای کاربران داخل یا دارای صورتحساب ایران مجاز نیست.
- دورزدن محدودیت جغرافیایی با VPN، پراکسی، کشور جعلی یا سرور ثالث ممنوع است.

## 1. Product boundary

Momentum may support general wellness goals such as:

- general fitness, strength, mobility, and exercise habits;
- weight maintenance or non-clinical weight-change goals;
- general meal structure and food variety;
- planning around schedule, equipment, preferences, and culture;
- progress logging and reflective coaching.

Momentum must not represent itself as providing:

- diagnosis, prognosis, cure, treatment, or prevention of disease;
- therapeutic diets or clinical nutrition care;
- medication, supplement interaction, or dosage advice;
- rehabilitation or injury treatment;
- emergency services or crisis counseling;
- guaranteed body composition, performance, or weight outcomes;
- licensed professional advice without appropriate licensed involvement.

User-facing language must say “general wellness coach” or equivalent. Marketing may not use “doctor,” “dietitian,” “medical,” “clinical,” “treatment,” or equivalent claims unless a separately approved regulated service genuinely supports that statement.

## 2. Age policy

MVP is 18+.

- Age confirmation is required before health onboarding.
- A user indicating an age below 18 cannot receive AI-generated exercise or diet planning.
- The date of birth need not be stored when an age-band and verification timestamp satisfy the approved design.
- Age checks are server-enforced.
- Product copy must not encourage unhealthy dieting, compulsive exercise, or body shame.

Serving minors later is a separate product requiring age assurance, parental/guardian and jurisdiction review, child-specific safety design, privacy controls, and OpenAI under-18 compliance. It is not a normal roadmap expansion.

## 3. Automated-plan eligibility

### Allowed path

An adult may enter the automated general-wellness path only when:

- required consent is current;
- country/provider eligibility passes;
- the user selects a general-wellness goal;
- safety screening does not identify an excluded case;
- required profile data is present and internally consistent;
- no account, abuse, or safety block applies.

### Excluded or professional-review path

The automated system must not issue a personalized plan when information indicates that qualified professional judgment is required. Initial categories include:

- pregnancy or breastfeeding;
- current eating disorder, high-risk history, or behaviors suggesting disordered eating;
- diabetes or glucose-management needs;
- kidney, liver, cardiovascular, or other condition materially affected by diet/exercise;
- medication materially affecting appetite, weight, blood pressure, glucose, hydration, or exercise tolerance;
- recent surgery, active injury, severe pain, fainting, chest pain, breathing difficulty, or other urgent symptom;
- clinician-prescribed diet, fluid, electrolyte, protein, or activity restrictions;
- any request to diagnose, treat, or override professional care;
- uncertain age or country/provider eligibility.

This list is intentionally conservative and must be expanded or modified only with licensed professional and legal review. The model does not decide eligibility alone; deterministic policy evaluates structured fields and model-detected free-text signals can only escalate.

### Safe response

When blocked, Momentum must:

1. avoid generating or partially revealing a plan;
2. state the relevant product boundary without diagnosing the user;
3. recommend an appropriate qualified professional;
4. show urgent/emergency guidance when the user reports urgent symptoms;
5. preserve access to account, privacy controls, and already-safe educational content;
6. log a minimal reason code and policy version.

## 4. Body composition and image policy

- Body measurements are optional and source-labelled: self-reported, device-reported, or professionally measured.
- Momentum does not claim a precise body-fat percentage from a casual photo.
- A body photo is never required for core service.
- Photo processing requires separate explicit consent, private storage, signed short-lived access, restricted staff access, deletion controls, and a retention period.
- Do not infer identity, ethnicity, health diagnosis, attractiveness, or other sensitive attributes from body images.
- Feedback must be neutral, functional, and non-stigmatizing.

## 5. Nutrition and exercise controls

AI composes from governed exercise and food catalogs. It does not invent nutrient facts, allergen status, exercise IDs, or contraindication rules.

Before a plan is published, deterministic validators must check:

- all catalog identifiers exist and are active;
- units and serving conversions are valid;
- required plan fields and schedule constraints are present;
- recorded allergen exclusions and dietary constraints are respected;
- equipment and experience constraints are respected;
- volume, progression, energy, and macro rules match the version approved by licensed reviewers;
- no excluded clinical claim or instruction appears;
- substitutions remain within approved constraints;
- output language and user-facing warnings are correct.

Clinical thresholds, minimum intake rules, exercise contraindications, progression bounds, and emergency language must be authored or signed off by appropriately licensed professionals. Engineering must not invent them, and the model must not fill missing rules.

## 6. AI safety architecture

### Request pipeline

```text
authenticated request
  -> account and entitlement check
  -> country/provider eligibility check
  -> consent and age check
  -> deterministic safety screen
  -> input moderation and abuse controls
  -> bounded context assembly
  -> model route
  -> structured output parsing
  -> catalog + deterministic + policy validators
  -> output moderation
  -> publish, repair, safe fallback, or escalate
```

No step may be client-only. A direct backend call must encounter the same controls.

### Model routing policy

- Luna: routing, extraction, classification, summaries, routine coach interaction.
- Terra: structured program creation and recalibration.
- Sol: exception path only when evals demonstrate a material quality benefit; never a substitute for professional review.
- Reasoning level is explicit by task and minimized where quality remains acceptable.
- Model aliases and prompt versions are configuration-controlled and auditable.

### Prompt requirements

Prompts must define:

- the allowed general-wellness outcome;
- available structured evidence and approved catalogs;
- hard safety, privacy, and permission constraints;
- required output schema;
- refusal/escalation behavior;
- stopping conditions and bounded tool use;
- desired language without inferring country from language.

Prompts must not contain raw secrets or unnecessary identity data. Repeated instructions are removed and evaluated rather than accumulated indefinitely.

### Context and retention

- Send the smallest relevant structured profile and trend summary.
- Do not resend the full conversation or full health record on every turn.
- Use a pseudonymous `safety_identifier`, not email or phone.
- Use `store: false` where supported and compatible.
- OpenAI's default abuse-monitoring retention can be up to 30 days; user disclosures and privacy notices must reflect actual provider behavior.
- Zero Data Retention is a future control that requires provider approval; it must not be claimed until enabled and verified.

### Moderation and abuse

- Use the provider's available moderation capabilities for input and output.
- Add product-specific classifiers/rules for disordered eating, unsafe exercise, medical boundary, self-harm, body shame, prompt injection, and geographic circumvention.
- Rate-limit by IP, account, entitlement, and risk signal.
- Provide a visible issue-report mechanism monitored by a human.
- A safety denial does not consume a paid entitlement.

## 7. Data and privacy policy

Health-related data is sensitive even when Momentum is not a HIPAA covered entity.

Required controls:

- explicit, versioned consent for the stated purposes;
- data minimization and documented retention;
- encryption in transit and at rest through approved providers;
- PostgreSQL RLS and least privilege;
- private object storage for sensitive media;
- secrets only in approved server-side stores;
- audited privileged access;
- self-service export, correction, and deletion request;
- incident and breach-notification plan;
- current processor/subprocessor register and DPAs;
- no health-data sale or targeted health advertising;
- no raw health fields in generic analytics, support screenshots, logs, or error trackers.

### HIPAA and US consumer-health data

HIPAA applicability depends on the entity and relationship; a direct-to-consumer app is not automatically HIPAA covered. This does not remove FTC Act or Health Breach Notification Rule obligations. Momentum must not market itself as “HIPAA compliant” without a completed legal determination, BAAs where needed, verified provider configuration, policies, and audits.

Supabase's terms prohibit processing HIPAA-defined PHI without a BAA. If Momentum enters a covered-entity/business-associate workflow, storage and AI providers must be reassessed before data collection.

### GDPR and international users

Health data is a special category under GDPR. EU launch requires a documented lawful basis, explicit consent where relied on, clear notices, user rights, processor contracts, transfer mechanism, retention, and likely a DPIA/legal assessment for the actual design.

## 8. Geographic and provider eligibility

### General rule

- Maintain a versioned allowlist based on current provider documentation and legal approval.
- Check eligibility when onboarding, creating a trial, creating a subscription intent, and executing every AI job.
- IP is one signal; billing country, user declaration, provider rules, and fraud review can also matter.
- Do not retain full IP longer than the approved security/privacy purpose.
- Ambiguity fails closed for AI while preserving account and support access.

### Iran — mandatory launch blocker

**Verified source fact on 2026-07-31:** Iran is not on OpenAI's supported-country list. OpenAI states that accessing or offering access outside supported locations may result in account blocking or suspension.

**Mandatory product state:**

| Capability for user located or billed in Iran | State |
| --- | --- |
| Persian informational pages | May be considered after ordinary legal/privacy review |
| Account/waitlist without AI | May be considered after ordinary legal/privacy review |
| Local food catalog browsing without AI | May be considered after ordinary legal/privacy review |
| AI trial | Disabled |
| AI coach | Disabled |
| AI plan generation/recalibration | Disabled |
| Purchase or activation of AI plan | Disabled |
| VPN/proxy/geography circumvention | Prohibited |

The blocker clears only with:

1. written provider authorization for the proposed service and end-user geography;
2. qualified sanctions/export-control and local-market legal approval;
3. compliant payment and contractual structure;
4. approved health-data transfer and privacy assessment;
5. successful server-side eligibility and bypass tests;
6. signed launch decision by Product, Legal, Safety, and Engineering.

No news, silence, competitor behavior, or successful test request counts as permission.

## 9. Safety severity and incident response

| Severity | Example | Required response |
| --- | --- | --- |
| P0 Critical | cross-user health-data exposure; AI served in blocked geography at scale; dangerous personalized medical instruction; secret compromise | Stop affected path, page incident lead, preserve evidence, revoke/contain, legal/privacy assessment |
| P1 High | repeated unsafe plan class; allergen conflict exposed; eligibility bypass; deletion failure involving sensitive data | Disable feature/cohort, investigate same day, notify owners, remediation and review |
| P2 Medium | isolated validator escape without likely harm; misleading copy; recurring localization safety defect | Triage within one business day, patch and add regression test |
| P3 Low | cosmetic disclosure issue with no control failure | Normal backlog with owner/date |

The incident runbook in [Operations](../OPERATIONS.md) governs containment, communication, recovery, and follow-up. Public notification is determined by law and incident facts, not by marketing preference.

## 10. Evaluation and release testing

### Required eval sets

- ordinary workout and nutrition goals in Persian and English;
- incomplete, contradictory, and changing profile data;
- allergies, preferences, equipment limits, and schedule changes;
- requests for diagnosis, treatment, medication, supplement dosage, or clinical diets;
- pregnancy, minors, eating-disorder signals, injuries, pain, and urgent symptoms;
- prompt injection and attempts to reveal system prompts or bypass policies;
- unsupported-country and VPN/billing-country mismatches;
- body-shaming, overtraining, extreme restriction, and compulsive behavior;
- retries, provider outage, malformed JSON, unknown catalog IDs, and long context;
- RTL, unit conversion, timezone, and local-food substitutions.

### Minimum technical gates

- 100% expected schema parsing in deterministic fixtures;
- zero unknown catalog identifiers exposed;
- zero known disqualifying profiles receiving plans;
- zero cross-user RLS access;
- zero secret in client bundle or repository scans;
- idempotency tests prevent duplicate plan/cost creation;
- restore drill passes;
- deletion/export flows pass;
- provider-country enforcement passes direct API bypass attempts;
- p95 cost stays within approved plan envelope;
- human-reviewed safety suite has zero severe exposed failures.

A model, prompt, schema, catalog, safety-rule, or major provider change requires targeted regression evaluation before promotion.

## 11. Public launch gates

All applicable owners must sign off. “Not applicable” requires a written rationale.

### Product and UX

- [ ] Persian and English critical journeys complete
- [ ] AI disclosure and general-wellness boundary visible
- [ ] safe blocked/referral experience reviewed
- [ ] cancellation, export, deletion, and report controls reachable
- [ ] accessibility and mobile checks pass

### Professional and legal

- [ ] licensed exercise/nutrition reviewers approve governed rules and examples
- [ ] terms, privacy notice, consent, disclaimers, and retention approved
- [ ] launch countries and provider eligibility approved
- [ ] health-data, consumer, AI, sanctions/export, and tax reviews complete as applicable
- [ ] insurance and incident-notification requirements evaluated

### Security and privacy

- [ ] threat model and security review complete
- [ ] RLS and authorization tests pass
- [ ] secrets and dependency scans pass
- [ ] backups and restore drill pass
- [ ] data inventory, processor register, and access review complete
- [ ] export/deletion and incident playbooks exercised

### AI quality and economics

- [ ] model router and prompt/schema versions fixed for launch
- [ ] safety and quality evals pass in both languages
- [ ] deterministic validators and fail-closed behavior pass
- [ ] moderation, rate limits, entitlement limits, and circuit breaker pass
- [ ] cost load test stays within p95 envelopes
- [ ] spend alerts and internal hard controls verified

### Operations

- [ ] monitoring and on-call ownership active
- [ ] support macros and escalation contacts ready in both languages
- [ ] rollback and feature kill switches tested
- [ ] status and incident communication path ready
- [ ] source/policy review date current

### Iran-specific gate

- [ ] Written AI-provider permission
- [ ] Legal approval for proposed end-user service
- [ ] Payment/entity approval
- [ ] Privacy/data-transfer approval
- [ ] Eligibility bypass test passed
- [ ] Cross-functional signed Go

If any Iran-specific box is unchecked, Iran AI remains **No-Go**.

## 12. Marketing and communication policy

Allowed examples:

- “A plan adapted to the goals, schedule, equipment, and food preferences you provide.”
- “General fitness and nutrition coaching with ongoing check-ins.”
- “AI-assisted; important limitations and professional referrals apply.”

Disallowed examples without separate evidence/regulatory approval:

- “Diagnoses the cause of your weight problem.”
- “Treats diabetes, injury, hormonal issues, or eating disorders.”
- “Guaranteed weight loss or muscle gain.”
- “Clinically accurate body-fat analysis from one photo.”
- “A doctor/dietitian replacement.”
- “Available in Iran” while the provider restriction is unresolved.

Testimonials must not be edited into unsupported health claims. Before/after imagery requires consent, fairness review, and must not imply typical or guaranteed outcomes.

## 13. Policy review triggers

Review immediately after:

- a provider policy, supported-country, model, price, or data-retention change;
- a safety/privacy incident or credible user report;
- launch in a new country or language;
- adding minors, wearables, photos, voice, payments, human coaches, or clinical features;
- entering a relationship with a healthcare provider, employer, insurer, or school;
- a change in data processor, region, or retention;
- evidence that user behavior is becoming compulsive, disordered, or unsafe.

Otherwise review at least quarterly. See [Official Sources](./SOURCES.md).
