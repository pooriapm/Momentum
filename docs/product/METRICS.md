# Momentum metrics framework

Version: 1.0
Last reviewed: 2026-07-31
Status: Measurement specification; targets are initial hypotheses

## Measurement principles

- Measure useful member outcomes and repeatable habits, not time spent in chat.
- A growth metric never overrides a safety, privacy, or cost guardrail.
- Keep product analytics separate from identifiable health records.
- Do not send raw messages, body photos, exact measurements, allergies, diagnoses, or free-text safety disclosures to general analytics tools.
- Every metric definition has one owner, query, timezone, eligibility filter, and version.
- Persian and English cohorts are compared for parity, not ranked as more or less valuable.
- Iran AI cohorts must not exist while the Iran launch blocker is active.

## North-star metric

### Weekly Coached Members with 3 Meaningful Actions — `WCM3`

A distinct eligible member who, within one product week:

1. has an active, validated plan;
2. records at least three meaningful plan actions on separate or appropriate plan occasions; and
3. completes at least one structured check-in.

A meaningful action is a completed planned workout, a logged planned meal/day, or an approved plan substitution followed by completion. Opening the app, sending an unstructured chat message, or generating repeated plans does not count.

```text
WCM3 = count(distinct eligible_user_id)
where active_validated_plan = true
and meaningful_action_count >= 3
and structured_checkin_count >= 1
```

Why this metric: it combines planning, execution, and feedback without rewarding excessive chat or unhealthy over-exercise.

فارسی: معیار اصلی تعداد کاربران واجد شرایطی است که در یک هفته برنامه معتبر دارند، حداقل سه اقدام واقعی مطابق برنامه ثبت می‌کنند و حداقل یک check-in ساختاریافته انجام می‌دهند.

## Metric hierarchy

| Layer | Question | Primary metrics |
| --- | --- | --- |
| Reach | Do eligible people discover Momentum? | Qualified visits, account starts |
| Activation | Do they reach a safe first value? | Safe Activation Rate, time to validated plan |
| Engagement | Do they execute and reflect? | WCM3, planned-action completion, check-in rate |
| Retention | Does value persist? | D7, W4, M3 eligible-cohort retention |
| Outcome proxy | Is the plan helping without overclaiming? | goal-direction trend, self-reported confidence/energy, adherence stability |
| Revenue | Is the business sustainable? | trial conversion, paid retention, net revenue, contribution margin |
| AI efficiency | Is coaching cost-controlled and reliable? | cost/member, tokens/task, validation pass rate, cache economics |
| Safety/privacy | Is harm prevented and handled? | unsafe exposure rate, escalation SLA, data incidents, RLS failures |
| Localization | Is quality comparable across experiences? | activation/retention gap, locale fallback rate, food substitution rate |

## Eligibility denominator

Unless explicitly stated, product metrics exclude:

- employees, automated tests, seeded accounts, and known abuse;
- users who did not accept the applicable terms/consent;
- users blocked by age or safety screening;
- countries where the requested AI service is unavailable;
- deleted accounts after the legally permitted aggregation window.

Blocked users are counted separately in eligibility and safety reporting so exclusion cannot hide demand or risk.

## Activation

### Safe Activation Rate — `SAR`

An eligible new account activates when it completes all of the following within 72 hours:

- required onboarding and consent;
- eligibility and safety screening;
- generation of a validator-approved initial plan;
- viewing the plan;
- recording the first meaningful action or scheduled commitment.

```text
SAR = safely_activated_new_accounts / eligible_verified_new_accounts
```

Initial target hypothesis: **60% or higher**. Track abandonment by field without recording sensitive field values in analytics.

Supporting metrics:

- verified-account rate;
- onboarding start/completion;
- safety-screen block/referral rate by non-sensitive reason code;
- median and p95 time to validated plan;
- initial-plan generation failure rate;
- first meaningful action within 24/72 hours.

## Engagement and retention

| Metric | Definition | Initial interpretation |
| --- | --- | --- |
| Planned action completion | completed eligible plan items / scheduled eligible plan items | Use with safety context; higher is not always better |
| Weekly check-in rate | members with ≥1 weekly check-in / members with an active plan | Core feedback-loop health |
| Substitution success | completed approved substitutions / accepted substitutions | Plan practicality |
| Regeneration rate | plan generations per active member/week | High values may indicate poor plans or abuse |
| D7 retained | activated users with a meaningful action on days 7–13 | Early value persistence |
| W4 retained | activated users qualifying for WCM3 in week 4 | Primary early retention |
| M3 paid retained | paid members active and not cancelled at month 3 | Business durability |

Do not optimize for number of workouts, calorie deficit, or weight-change speed in isolation. Those can become harmful incentives.

## Outcome proxies

Momentum does not claim clinical outcomes in MVP. Track bounded proxies:

- user-selected goal direction over a minimum trend window;
- consistency of weight/measurement trend without exposing raw values to analytics;
- self-reported plan fit, energy, recovery, confidence, and sustainability;
- percentage choosing less aggressive or more sustainable adjustments;
- percentage of recalibrations caused by schedule/equipment/preferences rather than model error;
- user-reported need for professional help and successful referral display.

Any public efficacy claim requires a separate evidence and legal review.

## Revenue metrics

| Metric | Formula |
| --- | --- |
| Trial-to-paid | first paid subscriptions / eligible trials ending in period |
| Monthly paid retention | paid members retained at period end / paid members eligible to renew |
| Logo churn | cancelled or expired paid accounts / opening paid accounts |
| Net revenue retention | ending recurring revenue including expansion/contraction / opening recurring revenue |
| ARPPU | net subscription revenue / average paying users |
| Contribution margin | (net revenue - variable COGS) / net revenue |
| LTV proxy | monthly contribution per paid user / monthly paid-user churn |
| CAC payback | acquisition cost / monthly contribution per new paid user |

Initial guardrails:

- p95 contribution margin at least 70% per live paid tier;
- no regional price below 3.5× p95 variable COGS in actual settlement currency;
- refund and chargeback rates reviewed before paid scaling;
- annual-plan cash is not recognized as one-month revenue in management reporting.

Iranian price-page impressions and waitlist interest may be measured, but there must be no Iran AI checkout, paid AI subscription, or AI usage event while blocked.

## AI quality and cost metrics

### Per-request fields

- opaque request ID and pseudonymous user ID;
- feature and task type;
- model and service tier;
- prompt version, schema version, and catalog version;
- uncached input, cached input, cache-write, reasoning, and output tokens where reported;
- estimated provider cost;
- latency and retry count;
- finish reason;
- schema validation, deterministic validation, catalog validation, and policy decision;
- repair count;
- user-visible/error/fallback outcome;
- country eligibility decision code without storing full IP.

### Aggregated metrics and guardrails

| Metric | Target / alert |
| --- | --- |
| First-pass schema validity | ≥99% target |
| Plan pass without second repair | ≥70% initial launch gate; improve with evals |
| Invalid output exposed to user | 0 |
| AI COGS / net subscription revenue | target <15%; alert 20%; incident 25% |
| p95 Core AI cost/member/month | ≤USD 2.00 maximum planning envelope |
| p95 Pro AI cost/member/month | ≤USD 4.25 maximum planning envelope |
| Sol share of routine user tasks | 0%; exception-only |
| Generation duplicate rate | <0.5% after idempotency |
| Provider error rate | alert at 2% over 15 min; incident threshold set after baseline |
| Cache net savings | cached-read savings minus cache-write premium; must be positive by prompt family |

OpenAI spend alerts are notification controls, not hard limits. Momentum must maintain its own entitlement and cost circuit breaker.

## Safety metrics

| Metric | Definition | Launch posture |
| --- | --- | --- |
| Confirmed unsafe exposure rate | confirmed unsafe user-visible outputs / 1,000 AI outputs | 0 in pre-launch suite; any severe production case is incident |
| Medical-boundary escape | tailored clinical advice shown without required professional path / 1,000 relevant attempts | 0 |
| High-risk automated plan rate | plans issued after disqualifying screen / eligible disqualifying screens | 0 |
| Allergen-rule violation | plan items conflicting with recorded allergen exclusions | 0 |
| Safety escalation delivery | escalations with correct safe response / required escalations | 100% in test suite |
| User safety report SLA | time from report to human triage | severity-based; P0 immediate on-call |
| Moderator disagreement | sampled outputs where human and system decision differ | Trend and review weekly |
| Body-shaming language rate | confirmed stigmatizing outputs / 1,000 outputs | 0 |

Safety metrics must retain enough evidence for investigation while minimizing sensitive content. Access is restricted and audited.

## Privacy and security metrics

- cross-user RLS access test failures: **0**;
- exposed service-role/API secrets: **0**;
- unauthorized health-data disclosure: **0**;
- export requests completed within published SLA;
- deletion requests completed within published SLA and backup policy;
- privileged-access reviews completed on schedule;
- backup success and restore-drill success;
- percentage of analytics events passing sensitive-field schema validation;
- vendor/subprocessor and retention register reviewed quarterly.

## Localization metrics

- Persian vs English Safe Activation Rate gap;
- Persian vs English W4 retention gap;
- RTL visual defect count and severity;
- translation fallback/missing-key rate;
- localized-food search success;
- meal substitution rate caused by unavailable regional ingredients;
- unit-conversion error rate;
- manual country override rate after IP suggestion;
- eligibility false-positive/false-negative reports.

A gap triggers investigation; it does not justify hiding a locale or inferring nationality from language.

## Event taxonomy

Recommended event names:

```text
account_created
email_verified
consent_recorded
onboarding_started
onboarding_completed
eligibility_evaluated
safety_referral_shown
plan_generation_requested
plan_generation_completed
plan_validation_failed
plan_viewed
plan_item_substituted
meaningful_action_completed
daily_checkin_completed
weekly_checkin_completed
recalibration_requested
recalibration_completed
coach_turn_requested
coach_turn_completed
coach_turn_blocked
export_requested
deletion_requested
pricing_viewed
trial_started
subscription_intent_created
quota_reached
user_report_submitted
```

Each event carries only approved categorical metadata. Raw health values and conversation text remain in the operational database, not the analytics payload.

## Dashboard cadence and owners

Daily operations:

- provider health, errors, latency, duplicate jobs, safety P0/P1, spend velocity.

Weekly product review:

- activation, WCM3, W4 leading indicators, plan quality, AI cost, safety sampling, locale parity.

Monthly business review:

- paid cohorts, churn, contribution margin, trial economics, support burden, refunds.

Quarterly governance review:

- policies and source freshness;
- model/prompt evals;
- privacy retention and subprocessors;
- pricing and regional eligibility;
- Iran blocker status. Absence of new written approval means it remains blocked.

## Experiment policy

- Experiments cannot weaken safety screening, disclosure, privacy, deletion, or provider-country enforcement.
- Price tests are assigned by verified billing market, never language alone.
- Do not test aggressive weight-loss framing, body shame, fear, or streak loss.
- Define primary metric, guardrails, sample, stop conditions, and analysis before exposure.
- Stop immediately on a material safety, privacy, or unexpected-cost signal.
- Log experiment version so results can be reproduced.

See [Monetization](./MONETIZATION.md), [Safety and Launch Policy](./SAFETY_AND_LAUNCH_POLICY.md), and [Operations](../OPERATIONS.md).
