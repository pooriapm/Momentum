# Momentum country Go/No-Go register — pre-launch

**Status:** all real-user markets are `HOLD` or `NO-GO`; this document grants no
market approval. A country appearing on a provider list is necessary for that
provider feature, but never sufficient for Momentum launch.

## Current decision register

| Market/cohort | Informational site | Account without AI | AI plan/coach/trial | Payment | Decision |
| --- | --- | --- | --- | --- | --- |
| Iran: located in or trusted billing country `IR` | `HOLD` pending ordinary web/privacy review | `HOLD`; only a separately approved non-AI/waitlist scope | **NO-GO** | **NO-GO** for AI product | Hard blocker: provider + sanctions/export-control + privacy/payment/legal review |
| Any other country | `HOLD` until host/cookie/legal review | `HOLD` until privacy, security and support gates pass | `HOLD` until the country is both provider-supported and explicitly approved | `HOLD` until merchant, tax, consumer and refund review | No blanket global launch |
| Internal synthetic Preview | Allowed in controlled development/review environments | No real account/health collection required | Mock/off by default | Off | Development only, not a market launch |

Language, IP hint, cuisine preference, self-declared country, billing country,
data-storage region, citizenship, and current physical location are distinct.
Persian UI or Iranian food content never grants AI eligibility.

## Iran mandatory blocker

As checked on 2026-08-01, Iran is absent from OpenAI's official API supported-
country list. OpenAI states that accessing or offering API access outside its
listed locations may lead to blocking or suspension. Momentum therefore must
fail closed for Iran on every AI request and before trial or subscription
activation.

The blocker cannot be cleared by a successful test request, competitor behavior,
VPN/proxy use, a foreign cloud region, self-declared foreign country, or a price
shown in the UI. It requires all of:

1. written authorization from the AI provider for Momentum's service and end-user
   geography;
2. qualified sanctions/export-control and local-market legal approval;
3. approved health-data processing and international-transfer assessment;
4. a compliant merchant/payment/tax/consumer structure;
5. trusted server-side country evidence and bypass tests;
6. signed Product, Legal, Privacy, Safety, Security, and Engineering Go decision.

Source: [OpenAI API supported countries and territories](https://help.openai.com/en/articles/5347006).

## Per-country approval checklist

A country can move from `HOLD` to a scoped `GO` only when the decision record
identifies the exact features and proves:

- the legal operator, customer terms, privacy notice, contact and complaint
  process are valid for that market;
- adults-only eligibility and the general-wellness/regulated-product boundary
  are approved by qualified counsel and licensed reviewers;
- applicable consumer-health privacy, general privacy, breach notification,
  AI-transparency and automated-decision obligations are assessed;
- every required provider supports the geography and contract scope;
- data region, cross-border transfer, processor register and retention/deletion
  workflow are approved;
- authentication, RLS/private Storage, export, correction, deletion, recovery,
  abuse, support, incident and restore tests pass;
- nutrition/exercise validation and bilingual safety evals meet the release bar;
- payment currency, tax, merchant, renewal, cancellation and refund behavior are
  approved if payment is included;
- pricing has positive margin under the market's verified AI/infrastructure and
  payment costs;
- feature switches and server allowlist are changed only after the signed record.

Provider-supported countries must still start at `HOLD`. An allowlist value in
an example environment file is configuration syntax, not evidence of approval.

## Server enforcement evidence

Before any AI `GO`, tests must prove that:

- self-declared or IP country cannot set the protected AI billing-country state;
- missing, stale, conflicting, or unverified country evidence fails closed;
- `IR` is hard-denied even if mistakenly added to an allowlist;
- direct Edge Function calls cannot bypass UI, consent, age, entitlement,
  automation-safety, email, feature-switch, or country checks;
- trial creation and checkout use the same trusted eligibility decision;
- logs record only categorical decision codes, not raw IP or health data;
- there is no support/admin override except a separately audited country-
  verification process defined by policy.

## Decision record template

```text
Country / feature scope:
Decision: GO | HOLD | NO-GO
Effective and review dates:
Legal operator / merchant:
Provider-support evidence and date:
Privacy/health/AI/consumer-law assessment:
Data region and transfer mechanism:
Payment/tax/refund assessment:
Security/safety/eval evidence:
Known exclusions:
Kill-switch and rollback owner:
Approvals: Product | Legal | Privacy | Safety | Security | Engineering
```

Review every `GO` before launch, quarterly, and whenever a provider policy,
country list, model, payment route, privacy law, safety scope, or data flow changes.
