# Momentum product documentation

Last reviewed: 2026-07-31

This directory contains the source-of-truth product decisions for Momentum, a bilingual AI-assisted fitness and nutrition coaching product.

## Documents

- [Public bilingual PRD](./PRD.md)
- [Monetization, pricing, and unit economics](./MONETIZATION.md)
- [Product and safety metrics](./METRICS.md)
- [Safety and launch policy](./SAFETY_AND_LAUNCH_POLICY.md)
- [Official source register](./SOURCES.md)
- [Delivery roadmap](../ROADMAP.md)
- [Operations runbook](../OPERATIONS.md)

## Decision status

| Decision | Status |
| --- | --- |
| Product name remains **Momentum** | Approved |
| Persian and English product experience | Approved |
| Account-based, server-stored product | Approved |
| PostgreSQL through Supabase for the first production architecture | Approved for MVP |
| Subscription-led monetization without ads or health-data sale | Approved hypothesis; payment implementation deferred |
| OpenAI model routing and cost controls | Approved design; requires implementation and evals |
| Public AI launch in OpenAI-supported markets | Conditional on launch gates |
| AI access and paid AI plans for users in Iran | **Blocked / disabled until written provider and legal approval** |

## Non-negotiable launch blocker

As of 2026-07-31, Iran is not listed among the countries and territories supported for the OpenAI API. OpenAI states that accessing or offering access to its API outside listed locations may lead to an account being blocked or suspended.

Momentum must therefore keep AI coaching and paid AI subscriptions disabled for users located or billed in Iran until all of the following exist:

1. written confirmation from the chosen AI provider that serving those users is permitted;
2. legal review covering sanctions, export controls, consumer protection, health-data processing, and payment flows;
3. an approved operational path that does not rely on VPNs, proxies, or geographic circumvention.

Persian UI, Iranian food localization, a waitlist, and non-AI educational functionality may be prepared separately, subject to their own legal review.

---

## راهنمای مستندات محصول

این پوشه مرجع تصمیم‌های محصول Momentum است. محصول برای تجربهٔ فارسی و انگلیسی، حساب کاربری، ذخیره‌سازی سمت سرور و مربی هوشمند شخصی‌سازی‌شده طراحی می‌شود.

مهم‌ترین محدودیت انتشار: تا تاریخ ۱۴۰۵/۰۵/۰۹ برابر با ۲۰۲۶-۰۷-۳۱، ایران در فهرست کشورهای پشتیبانی‌شدهٔ OpenAI API قرار ندارد. بنابراین مربی AI و فروش پلن‌های AI برای کاربر داخل ایران باید غیرفعال بماند تا مجوز کتبی سرویس‌دهنده و تأیید حقوقی دریافت شود. استفاده از VPN، پراکسی یا سرور کشور ثالث راه‌حل قابل قبول محصولی یا عملیاتی نیست.
