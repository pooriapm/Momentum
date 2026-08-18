# Momentum monetization, pricing, and unit economics

Version: 1.4
Status: Approved product hypothesis; thin payments (5a) are a generation prerequisite; full checkout hardening (5b) is later
Last reviewed: 2026-08-16
Price review cadence: quarterly and before launch in a new country

> **D12:** `product_region=ir` shows IRR list prices; `intl` shows USD. Both versions sell the same subscription. Iranian prices are the live list for sticky Iranian accounts, not a hidden/unavailable SKU.

## تصمیم محصول / Product decision

Momentum uses a dynamically budgeted first-plan gift followed by one recurring subscription. The public funnel is self-serve: sign up, add a payment method, receive the first monthly plan as a gift while campaign budget remains, then pay the single subscription at cycle 2. It does not use ads, sell health data, meter visible tokens, sell lifetime AI access, or offer Core/Pro tiers. A 7-day trial is not the product.

قبل از اولین generation، کاربر روش پرداخت را با SetupIntent یا مجوز صفر ثبت می‌کند. کارت تا چرخهٔ دوم شارژ نمی‌شود. `admin_review` فقط استثنای پشتیبانی است. ارز فهرست از `product_region` قفل‌شده می‌آید.

Momentum در صورت وجود ظرفیت بودجه، برنامهٔ ماه اول را به حساب واجد شرایط هدیه می‌دهد و سپس یک اشتراک دوره‌ای ارائه می‌کند. محصول تبلیغ نمایش نمی‌دهد، داده سلامت را نمی‌فروشد، هر توکن را به کاربر قیمت‌گذاری نمی‌کند و دسترسی مادام‌العمر AI ارائه نمی‌دهد.

### Why subscription

- Subscription value is continuous: tracking, check-ins, history, and one new
  combined workout-and-nutrition plan for each verified monthly period.
- AI and infrastructure create continuing variable cost, making lifetime access structurally unsafe.
- A health product should align revenue with user value rather than engagement-maximizing ads.
- The FTC specifically treats unauthorized disclosure of identifiable health data, including some ad-network sharing, as a potential health-data breach concern. See [official sources](./SOURCES.md).
- A bounded subscription makes unit economics and abuse controls understandable.

## Proposed offer architecture

All prices exclude taxes and are hypotheses until a real checkout, entity, and market-specific consumer review exist.

| Offer | `intl` list price | `ir` list price | Monthly entitlement | Product status |
| --- | ---: | ---: | --- | --- |
| Preview / first-plan gift | Static preview; first real monthly plan gifted while configured budget remains. Requires a payment method before generation; the card is not charged for the gifted cycle. | Same gift rules; IRR presentation | One complete plan after atomic campaign-budget reservation | Both product versions |
| Momentum subscription | USD 14.99/month | IRR 4,900,000/month (490,000 toman) | 1 complete combined plan per monthly plan cycle | Both versions; currency from sticky `product_region`. Annual SKU is not in MVP |

The international and Iran annual prices remain later hypotheses, not the MVP
offer. MVP billing is monthly only.

### Entitlement detail

| Capability | Static Preview | First-plan gift | Momentum subscription |
| --- | --- | --- | --- |
| Account and profile | Optional demo | Required | Required |
| Complete workout and nutrition plan | Demonstration data | One gifted monthly cycle while budget remains | One per active monthly plan cycle |
| Daily plan execution + weekly general report | Demo only | Yes for the gifted cycle | Yes. Weekly report does not call AI |
| Additional AI call or mid-cycle regeneration | No | No | No |
| Saved-plan history | No | Gifted plan remains visible | Yes |
| Portable data export | No account data | Yes | Yes |
| Human clinical review | No | No | No; separate future discovery only |

Entitlements are hard backend ceilings, not just UI labels. Generation does not
roll over or accumulate. Month two and later start only after active subscription
verification. Safety guidance, account support, and already-saved plans remain
available if renewal or generation fails.

The first-plan gift is a capped campaign, not an unlimited entitlement. Its
server-owned configuration can pause new gifts when settled cost plus active
reservations reaches the configured budget. Existing reservations and saved
plans are never revoked by a later pause.

## Regional pricing and localization policy

`product_region` is the only field that chooses list currency and default UI language. Cuisine, calendar, and units stay separate.

1. Anonymous IP selects a temporary version: Iran → `ir` (fa, IRR); otherwise `intl` (en, USD).
2. At signup that value is written to `profiles.product_region` and locked. Later IP, VPN, or travel does not change it.
3. Users may change calendar, units, and cuisine. They cannot change list currency by switching language or IP.
4. A payment method is required before generation; the card is not charged until cycle 2. Processor billing country is for settlement/tax later, not an AI geo-gate.
5. Iranian foods can still be catalog items for any cuisine preference; they do not imply `product_region`.
6. IRR prices are the list for sticky `ir` accounts. USD prices are the list for `intl` accounts.

### Operator note (not a product wall)

OpenAI's published API country list omitted Iran as of 2026-07-31. That is an operator/provider checklist before enabling live production AI. D12 does not show a user-facing geo-block, waitlist, or unavailable market screen.

## Official price benchmarks

Verified 2026-07-31; market benchmarks require re-verification before checkout:

| Product | Officially observed price | Use in Momentum decision |
| --- | ---: | --- |
| MacroFactor | USD 11.99 monthly; USD 71.99 yearly | Lower/medium international nutrition-coach benchmark |
| MyFitnessPal Premium | USD 19.99 monthly; USD 79.99 yearly | High monthly and mainstream annual benchmark |
| FitNova Iran | 500,000 toman/month training; 300,000 toman/month nutrition | Local AI-style training/nutrition benchmark |
| Balance Academy | 970,000 toman for two months combined | Local human-supported comparison, not a direct SaaS peer |

The Momentum subscription carries a premium over some reviewed tracker products
because it includes a validated combined plan each active month. Additional paid
tiers are outside the MVP until a distinct non-AI value is proven.

These comparisons do not prove willingness to pay. Launch pricing requires interviews, landing-page conversion tests, gift-to-paid conversion, and cohort retention.

## OpenAI source pricing used in the model

Standard price per 1 million tokens, re-verified 2026-08-13:

| Model | Input | Cached input | Output |
| --- | ---: | ---: | ---: |
| GPT-5.6 Luna | USD 1.00 | USD 0.10 | USD 6.00 |
| GPT-5.6 Terra | USD 2.50 | USD 0.25 | USD 15.00 |
| GPT-5.6 Sol | USD 5.00 | USD 0.50 | USD 30.00 |

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

### Monthly generation working scenario

Momentum hypothesis, using uncached standard prices so cache savings are not required for viability:

- one Terra combined-plan job/month;
- average 12,000 input and 6,000 output tokens per job, including the minimized
  baseline and, after month one, the previous-period snapshot.

| Workload | Calculation | Monthly AI cost |
| --- | --- | ---: |
| Terra input | 12k × USD 2.50/M | USD 0.030 |
| Terra output | 6k × USD 15.00/M | USD 0.090 |
| Expected direct AI | Sum | **USD 0.120** |

Single-subscription operating envelope:

- expected direct AI: approximately USD 0.12;
- conservative per-cycle AI reservation: USD 0.48, including retry and long-output headroom;
- variable infrastructure/support hypothesis after roughly 100+ paying members: USD 0.60–0.90/member;
- target all-in variable COGS ceiling: USD 2.00/member;
- at a hypothetical 15% store/distribution fee, USD 14.99 yields USD 12.74 before tax;
- resulting contribution-margin hypothesis is approximately 84% at the USD 2.00 ceiling. The USD 149.99 annual price yields about USD 10.62 net per month and approximately 81% at the same ceiling.

These margin estimates are planning assumptions, not forecasts. They exclude taxes and may omit fixed labor, legal, professional review, insurance, and compliance costs.

## Price and cost guardrails

### Per-plan guardrails

- Momentum subscription target contribution margin: at least 70% at p95 usage.
- No plan launches with projected net revenue below 3.5× p95 variable COGS.
- Regional price remains active only if rolling 30-day data preserves the same floor.
- If the floor is breached: stop expensive model escalation, tighten generation frequency, improve context, then adjust price. Never silently lower safety validation.

### Portfolio guardrails

- AI COGS / net subscription revenue: target below 15%; alert at 20%; incident at 25%.
- Total variable COGS / net revenue: target below 30%.
- Refund and chargeback reserve: establish before payment launch.
- First-plan gift cost is controlled by the independent configured campaign budget and atomic reservation model. Conservative reservation is **USD 0.48** per gifted plan. Conversion target is 10% gift-to-paid; alert at 5%. Abuse and low conversion dominate token price as the economic risk.

## First-plan gift campaign capacity

```text
available_budget = configured_budget - settled_cost - active_reservations

accept_free_first_plan =
  campaign_enabled
  AND user_is_eligible
  AND user_has_never_received_gift
  AND market_is_allowed
  AND available_budget >= configured_reservation_cost
```

| Campaign budget | Max reservations at $0.48 |
| ---: | ---: |
| $100 | 208 plans |
| $500 | 1,041 plans |
| $1,000 | 2,083 plans |
| $5,000 | 10,416 plans |

| Gifted plans | Likely at $0.18 | Conservative at $0.30 | Cap at $0.48 |
| ---: | ---: | ---: | ---: |
| 100 | $18 | $30 | $48 |
| 1,000 | $180 | $300 | $480 |
| 10,000 | $1,800 | $3,000 | $4,800 |

Gift-to-paid CAC of the gifted plan:

| Conversion | at $0.18 | at $0.30 | at $0.48 |
| ---: | ---: | ---: | ---: |
| 20% | $0.90 | $1.50 | $2.40 |
| 10% | $1.80 | $3.00 | $4.80 |
| 5% | $3.60 | $6.00 | $9.60 |
| 2% | $9.00 | $15.00 | $24.00 |

A payment method is required before generation (D8). The card is not charged for the gifted cycle. That does not replace the dollar budget cap.

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

1. **Model routing:** Terra for the user's single monthly combined-plan call;
   body reports create no separate AI request.
2. **Deterministic engine:** calculate targets, conversions, entitlements, and safety rules outside the model.
3. **Governed catalogs:** retrieve valid foods/exercises; do not pay the model to recreate reference data.
4. **Structured state:** send profile summary, relevant trends, and recent deltas instead of complete history.
5. **Structured output:** store validated JSON once; render UI/PDF without regeneration.
6. **Prompt caching:** cache only stable prefixes. GPT-5.6 cache writes cost more than uncached input, so track read/write economics.
7. **Flex/Batch rates:** use asynchronous lower-cost processing for scheduled
   monthly generation where latency permits.
8. **Output limits:** set explicit output ceilings for the structured plan.
9. **Application hard caps:** provider spend alerts do not stop traffic; entitlements and a cost circuit breaker must.
10. **Per-feature ledger:** record estimated and invoiced cost by model, feature, user, country, and prompt version.

## Monetization exclusions

- No targeted advertising based on health, body, diet, or conversation data.
- No sale of identifiable or pseudonymous health data.
- No lifetime AI plan while variable cost exists.
- No dark-pattern cancellation or pre-checked marketing consent.
- No supplement affiliate recommendations inside generated plans during MVP.
- No paywall on emergency/safety guidance, privacy rights, or access to already-purchased saved plans.

## Future revenue, not MVP

These require separate discovery and safety/legal review:

- licensed human review add-on;
- professional-service portal with per-seat and per-active-client pricing;
- employer or gym wellness programs without employer access to individual health data;
- family plans after age and privacy design is mature;
- paid integrations or premium exports.

## Decision and experiment cadence

Weekly:

- AI cost per active and paying user;
- outlier users/jobs;
- quota denial and retry rates;
- first-plan gift reservations, settlement, and budget availability.

Monthly:

- conversion, churn, refund, contribution margin, and cohort retention;
- gift-to-paid conversion and cancellation reasons;
- price-page funnel split by country and language;
- safety incidents correlated with plan and usage intensity.

Quarterly:

- vendor prices and policies;
- official market benchmarks;
- regional settlement economics;
- entitlement redesign or price test decision;
- Iran blocker review, which remains blocked unless affirmative written approvals exist.

See [Metrics](./METRICS.md), [Operations](../OPERATIONS.md), and [Official Sources](./SOURCES.md).
