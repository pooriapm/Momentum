# Momentum country Go/No-Go register — pre-launch

**Product (D12, 2026-08-16):** Iran is a served product version. Anonymous Iran
IP and sticky `product_region=ir` accounts see Persian UI and IRR list prices.
Other IPs and `intl` accounts see English UI and USD. There is no user-facing
geo-block, waitlist, or “unavailable in this region” wall. Gift, checkout, and
monthly generation use the same rules in both versions.

**Operator register:** a country appearing on a provider list is still necessary
before turning on that provider in production, but it is not sufficient and it
is not expressed as a product screen. This file does not grant production-AI
enablement by itself.

## Current decision register

| Market/cohort | Product version | Informational site | Account + monthly AI | Payment | Decision |
| --- | --- | --- | --- | --- | --- |
| Sticky or IP `ir` | FA + IRR | Served | Served by product contract D12 | IRR list; method before generation | Product GO for the Iranian version. Provider/sanctions/payment entity remain ops checklist before live OpenAI is switched on |
| Sticky or IP `intl` | EN + USD | Served | Served by product contract D12 | USD list; method before generation | Product GO for the international version. Host/privacy/merchant review remain ops checklist |
| Internal synthetic Preview | n/a | Allowed in controlled development | Mock/off by default | Off | Development only, not a market launch |

Language follows `product_region`. Cuisine, calendar, and units are separate.
Persian UI does not require a later IP from Iran.

## Operator / provider checklist

As checked on 2026-08-01, Iran was absent from OpenAI's official API supported-
country list. That fact is an operator risk for enabling the live provider. It
must not be implemented as PUB-05 / PUB-10 / LIFE-06 unavailable screens.

Before production AI is enabled, ops still records:

1. the chosen provider contract and end-user geography;
2. sanctions/export-control and local-market legal review as required by the operator;
3. health-data processing and transfer assessment;
4. merchant/payment/tax/consumer structure for USD and IRR lists;
5. signed Product, Legal, Privacy, Safety, Security, and Engineering enablement
   of the live provider switch.

Source for the provider list: [OpenAI API supported countries and territories](https://help.openai.com/en/articles/5347006).

## Server enforcement evidence

Tests must prove that:

- signup IP writes `product_region` once (`ir` or `intl`);
- later IP or VPN does not change `product_region`;
- authenticated `geo-context` returns the locked account region;
- raw IP is not stored;
- age, safety, consent, payment method, and entitlement still gate generation;
- `REGION_BLOCKED` is not returned as a product error;
- logs record only categorical codes, not raw IP or health data.

## Decision record template

Keep a dated record when the live provider switch changes. Product versioning
(D12) does not wait on that record to design or to describe the two versions.
