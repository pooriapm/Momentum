# Momentum monetization, pricing, and unit economics

Version: 1.0
Status: Approved product hypothesis; checkout and payment are intentionally not implemented
Last reviewed: 2026-07-31
Price review cadence: quarterly and before launch in a new country

> **Iran status: INACTIVE / LAUNCH-BLOCKED.** Iranian prices below are planning hypotheses only. They must not be offered, charged, or connected to OpenAI-powered entitlements until written AI-provider permission and legal approval exist.

## تصمیم محصول / Product decision

Momentum uses an account-gated trial followed by recurring subscription. It does not use ads, sell health data, meter every visible token, or sell lifetime AI access.

Momentum از دورهٔ آزمایشی نیازمند حساب و سپس اشتراک دوره‌ای استفاده می‌کند. محصول تبلیغ نمایش نمی‌دهد، داده سلامت را نمی‌فروشد، هر توکن را به کاربر قیمت‌گذاری نمی‌کند و دسترسی مادام‌العمر AI ارائه نمی‌دهد.

### Why subscription

- Coaching value is continuous: tracking, check-ins, recalibration, and history.
- AI and infrastructure create continuing variable cost, making lifetime access structurally unsafe.
- A health product should align revenue with user value rather than engagement-maximizing ads.
- The FTC specifically treats unauthorized disclosure of identifiable health data, including some ad-network sharing, as a potential health-data breach concern. See [official sources](./SOURCES.md).
- A bounded subscription makes unit economics and abuse controls understandable.

## Proposed offer architecture

All prices exclude taxes and are hypotheses until a real checkout, entity, and market-specific consumer review exist.

| Plan | International price | Iran planning price | AI entitlement | Product status |
| --- | ---: | ---: | --- | --- |
| Preview | 7 days, free | 7 days, free | 1 plan + 10 coach turns total | Supported markets only |
| Core | USD 14.99/month or USD 149.99/year | IRR 4,900,000/month (490,000 toman) or IRR 39,200,000/year | 100 coach turns + 4 plan recalibrations/month | Iran inactive |
| Pro | USD 29.99/month or USD 259.99/year | IRR 8,900,000/month (890,000 toman) or IRR 71,200,000/year | 250 coach turns + 8 recalibrations/month | Iran inactive |

Annual discounts differ by offer: Core international is 16.6%, Pro international is 27.8%, and the inactive Iran hypotheses are 33.3% versus twelve monthly payments. These are conversion hypotheses and must be tested against retention and refund behavior.

### Entitlement detail

| Capability | Preview | Core | Pro |
| --- | --- | --- | --- |
| Account, profile, and server sync | Yes | Yes | Yes |
| Initial workout and nutrition plan | One preview plan | Yes | Yes |
| Daily/weekly logging | During trial | Yes | Yes |
| AI coach | 10 total turns | 100/month | 250/month |
| Plan recalibration | None after initial plan | Weekly allowance | Twice-weekly allowance |
| Export | Watermarked preview | PDF + portable data | PDF + portable data |
| Advanced model review | No | No | Future hypothesis; not included in current entitlement |
| Human clinical review | No | No | No; future paid add-on only |

Entitlements are hard backend ceilings, not just UI labels. Unused AI allowances do not roll over. Safety messages, account support, and access to already-saved plans must not be blocked by quota.

## Regional pricing and localization policy

Language, cuisine, geographic eligibility, billing country, and currency are separate fields.

1. IP may suggest a country and language, but is low-confidence and can be wrong because of travel or VPN use.
2. The user may manually choose language, units, and cuisine.
3. The future checkout's verified billing country determines available price and tax treatment.
4. Server-side eligibility determines whether an AI entitlement can be used.
5. A language change never grants a cheaper regional price.
6. Iranian foods can be suggested from a localized catalog without assuming every Persian speaker is in Iran.
7. Iranian AI prices stay hidden or visibly marked unavailable until the launch blocker clears.

### Iran launch blocker

**Source-backed fact:** as of 2026-07-31, Iran is absent from OpenAI's supported-country list. OpenAI says accessing or offering access outside supported locations may result in blocking or suspension.

**Momentum policy:** no Iran AI checkout, trial generation, coaching call, paid entitlement, or geographic circumvention. Persian UI and a waitlist can ship separately only after their own legal/privacy review.

Activation requires all of the following:

- written provider confirmation covering end users in Iran;
- sanctions and export-control legal review;
- approved payment and consumer-contract path;
- health-data and cross-border-transfer review;
- operational monitoring proving eligibility enforcement;
- a signed Go decision recorded in the launch register.

## Official price benchmarks

Verified 2026-07-31:

| Product | Officially observed price | Use in Momentum decision |
| --- | ---: | --- |
| MacroFactor | USD 11.99 monthly; USD 71.99 yearly | Lower/medium international nutrition-coach benchmark |
| MyFitnessPal Premium | USD 19.99 monthly; USD 79.99 yearly | High monthly and mainstream annual benchmark |
| FitNova Iran | 500,000 toman/month training; 300,000 toman/month nutrition | Local AI-style training/nutrition benchmark |
| Balance Academy | 970,000 toman for two months combined | Local human-supported comparison, not a direct SaaS peer |

Momentum Core carries a premium over the reviewed annual tracker products because the hypothesis includes recurring plan generation and coaching. The inactive Iran hypothesis is below the combined monthly list price of the reviewed local AI-style competitor. Pro charges for materially higher AI allowance and recalibration frequency.

These comparisons do not prove willingness to pay. Launch pricing requires interviews, landing-page conversion tests, trial conversion, and cohort retention.

## OpenAI source pricing used in the model

Standard price per 1 million tokens, re-verified 2026-08-03:

| Model | Input | Cached input | Cache write | Output |
| --- | ---: | ---: | ---: | ---: |
| GPT-5.6 Luna | USD 0.20 | USD 0.02 | USD 0.25 | USD 1.20 |
| GPT-5.6 Terra | USD 2.00 | USD 0.20 | USD 2.50 | USD 12.00 |
| GPT-5.6 Sol | USD 5.00 | USD 0.50 | USD 6.25 | USD 30.00 |

These are provider facts, not guaranteed future prices. The internal cost table must be config-driven and updated when the provider changes pricing.

## Unit economics model

### Definitions

```text
AI request cost =
  uncached_input_tokens × input_rate
  + cached_input_tokens × cached_input_rate
  + cache_write_tokens × cache_write_rate
  + output_tokens × output_rate

Monthly variable COGS =
  AI cost
  + variable database/storage/egress
  + variable email/observability
  + payment fees
  + expected refunds and chargebacks
  + variable support allocation

Contribution margin =
  (net revenue - monthly variable COGS) / net revenue
```

Taxes collected on behalf of authorities are not revenue. Founder time is not ignored in final business reporting even if it is excluded from early automated COGS dashboards.

### Core working scenario

Momentum hypothesis, using uncached standard prices so cache savings are not required for viability:

- 100 Luna turns/month;
- average 1,500 input and 500 output tokens per turn;
- 4 Terra plan/recalibration jobs/month;
- average 8,000 input and 3,000 output tokens per Terra job.

| Workload | Calculation | Monthly AI cost |
| --- | --- | ---: |
| Luna input | 150k × USD 0.20/M | USD 0.030 |
| Luna output | 50k × USD 1.20/M | USD 0.060 |
| Terra input | 32k × USD 2.00/M | USD 0.064 |
| Terra output | 12k × USD 12.00/M | USD 0.144 |
| Expected direct AI | Sum | **USD 0.298** |

Core operating envelope:

- expected direct AI: approximately USD 0.30 before body-report image tokens;
- p95 AI budget hypothesis: USD 2.00, allowing for reports, retries, longer contexts, cache writes, and uneven use;
- variable infrastructure/support hypothesis after roughly 100+ paying members: USD 0.60–0.90/member;
- target total variable COGS: USD 2.60–3.00/member;
- at a hypothetical 15% store/distribution fee, USD 14.99 yields USD 12.74 before tax;
- resulting monthly contribution-margin hypothesis: approximately 76–80%. The USD 149.99 annual price yields about USD 10.62 net per month and approximately 72% at the USD 3.00 p95 envelope.

### Pro working scenario

Momentum hypothesis:

- 250 Luna turns/month at the same average size;
- 8 Terra jobs/month;

| Workload | Monthly AI cost |
| --- | ---: |
| Luna | USD 0.225 |
| Terra | USD 0.416 |
| Expected direct AI | **USD 0.641** before body-report image tokens |

Pro operating envelope:

- p95 AI budget hypothesis: USD 4.25;
- variable infrastructure/support hypothesis: USD 0.75–1.10/member;
- target total variable COGS: USD 5.00–5.50/member;
- at a hypothetical 15% fee, USD 29.99 yields USD 25.49 before tax;
- resulting monthly contribution-margin hypothesis: approximately 78–80%. The USD 259.99 annual price yields about USD 18.42 net per month and approximately 70% at the USD 5.50 p95 envelope.

These margin estimates are planning assumptions, not forecasts. They exclude taxes and may omit fixed labor, legal, professional review, insurance, and compliance costs.

## Price and cost guardrails

### Per-plan guardrails

- Core target contribution margin: at least 70% at p95 usage.
- Pro target contribution margin: at least 70% at p95 usage.
- No plan launches with projected net revenue below 3.5× p95 variable COGS.
- Regional price remains active only if rolling 30-day data preserves the same floor.
- If the floor is breached: stop expensive model escalation, tighten generation frequency, improve context, then adjust price. Never silently lower safety validation.

### Portfolio guardrails

- AI COGS / net subscription revenue: target below 15%; alert at 20%; incident at 25%.
- Total variable COGS / net revenue: target below 30%.
- Refund and chargeback reserve: establish before payment launch.
- Free-trial AI cost: target below 10% of first-month net revenue multiplied by trial-to-paid conversion.
- No unlimited entitlement label.
- No prompt or model change reaches 100% traffic without cost and quality evaluation.

### Iranian price floor

Iranian list prices are not pegged to the official government FX rate. Before activation, Finance must calculate actual settlement proceeds after payment fees, conversion spread, refund risk, and tax.

```text
Activate localized price only when:
net_settlement_usd >= 3.5 × rolling_p95_variable_cogs_usd
```

If the condition fails, the product remains unavailable or the price/entitlement changes. Affordability does not authorize operating at a loss or bypassing provider restrictions.

## Cost-control design

1. **Model routing:** Luna for chat/extraction/summaries, Terra for plans, Sol only for eval-proven exception handling.
2. **Deterministic engine:** calculate targets, conversions, entitlements, and safety rules outside the model.
3. **Governed catalogs:** retrieve valid foods/exercises; do not pay the model to recreate reference data.
4. **Structured state:** send profile summary, relevant trends, and recent deltas instead of complete history.
5. **Structured output:** store validated JSON once; render UI/PDF without regeneration.
6. **Prompt caching:** cache only stable prefixes. GPT-5.6 cache writes cost more than uncached input, so track read/write economics.
7. **Flex/Batch rates:** use asynchronous lower-cost processing for scheduled recalibration and offline jobs where latency permits.
8. **Output limits:** set explicit output ceilings and low verbosity for routine interactions.
9. **Application hard caps:** provider spend alerts do not stop traffic; entitlements and a cost circuit breaker must.
10. **Per-feature ledger:** record estimated and invoiced cost by model, feature, user, country, and prompt version.

## Monetization exclusions

- No targeted advertising based on health, body, diet, or conversation data.
- No sale of identifiable or pseudonymous health data.
- No lifetime AI plan while variable cost exists.
- No dark-pattern cancellation or pre-checked marketing consent.
- No supplement affiliate recommendations inside personalized coaching during MVP.
- No paywall on emergency/safety guidance, privacy rights, or access to already-purchased saved plans.

## Future revenue, not MVP

These require separate discovery and safety/legal review:

- licensed human review add-on;
- coach portal with per-seat and per-active-client pricing;
- employer or gym wellness programs without employer access to individual health data;
- family plans after age and privacy design is mature;
- paid integrations or premium exports.

## Decision and experiment cadence

Weekly:

- AI cost per active and paying user;
- outlier users/jobs;
- quota denial and retry rates;
- trial consumption.

Monthly:

- conversion, churn, refund, contribution margin, and cohort retention;
- Core-to-Pro upgrade and downgrade reasons;
- price-page funnel split by country and language;
- safety incidents correlated with plan and usage intensity.

Quarterly:

- vendor prices and policies;
- official market benchmarks;
- regional settlement economics;
- entitlement redesign or price test decision;
- Iran blocker review, which remains blocked unless affirmative written approvals exist.

See [Metrics](./METRICS.md), [Operations](../OPERATIONS.md), and [Official Sources](./SOURCES.md).
