# Momentum Privacy Notice — pre-launch draft

**Status:** internal alpha draft; not effective and not suitable for publication.
**Legal review:** required before any real-user collection or public launch.
**Draft version:** `2026-08-01-alpha`
**Controller/operator:** `[LEGAL_ENTITY_NAME]`
**Privacy contact:** `[PRIVACY_EMAIL]`
**Registered address and applicable jurisdiction:** `[TO_BE_COMPLETED]`

The placeholders above are launch blockers. This document describes the intended
product data flow; it does not assert that every control or user-rights workflow
has been implemented or legally approved.

## خلاصه فارسی

Momentum برای ارائه حساب کاربری، برنامه عمومی تندرستی، ثبت روند و تولید برنامهٔ ماهانه به
اطلاعات حساب و داده‌های حساس مرتبط با سلامت نیاز دارد. فروش داده سلامت و تبلیغات
هدفمند بر اساس داده سلامت در سیاست محصول ممنوع است. داده‌های لازم برای قابلیت AI
به‌صورت حداقلی و از سرور برای provider ارسال می‌شوند. قابلیت AI ایران تا مجوز
کتبی provider و تأیید حقوقی مسدود است. این متن هنوز پیش‌نویس است و پیش از جمع‌آوری
داده واقعی باید توسط وکیل و مسئول حریم خصوصی تکمیل شود.

## 1. Scope and product boundary

Momentum is an 18+ general-wellness product, not a medical, diagnostic,
treatment, emergency, or licensed dietetic service. This notice is intended to
cover the Momentum web application and future approved native clients. A
separate notice may be required for the marketing site, employment, support, or
regulated services.

## 2. Intended data inventory

| Category | Examples | Intended purpose | Launch status |
| --- | --- | --- | --- |
| Account | email, auth identifier, session and verification state | create and secure an account | Built on Supabase; production configuration review pending |
| Profile | display name, age/date of birth, sex, height, locale, timezone, country and unit preferences | personalize the experience and apply eligibility rules | Alpha |
| Wellness and health context | weight, body measurements, goals, training schedule, preferences, allergies, medical/safety disclosures, supplements and limitations | screen eligibility and create a general-wellness plan | Sensitive; DPIA/legal and licensed-review gates remain |
| Uploaded reports | optional body-composition PDF/image/scan and extracted values | extract clearly readable measurements after explicit consent | Private-storage workflow is alpha; retention/deletion verification remains |
| Product records | plans, recipes, meal choices, workouts, check-ins and progress | deliver and synchronize the service | Alpha |
| AI operations | minimized structured monthly snapshot, generated output, model/schema version, token/cost and safety reason codes | generate and validate one combined monthly plan and control cost | Disabled by default; market approval required |
| Technical/security | timestamps, device/browser signals, approximate country hint, opaque trace IDs and abuse events | reliability, fraud prevention, security and diagnostics | Final logging inventory and retention are launch gates |
| Billing | plan, price, entitlement and transaction references | future subscription administration | Payment is not implemented; no payment data should be collected yet |

Raw passwords are handled by the authentication provider and must not be
available to Momentum application staff. Raw IP addresses and sensitive health
values must not be copied into generic analytics, error tracking, support
screenshots, or routine logs.

## 3. Why and on what legal basis data is processed

The intended purposes are to provide the requested service, secure accounts,
apply safety and geographic controls, meet legal obligations, and improve the
product using privacy-safe aggregate measures. The lawful basis for each
purpose—including any processing of special-category health data—must be
determined per launch jurisdiction. Explicit, versioned consent is required by
the product design for health onboarding and optional reports, but this draft
does not assume consent is the only or correct legal basis in every market.

Users must be able to withdraw optional consent without losing access to
unrelated account/privacy controls. Re-consent behavior after a notice or
purpose change remains a public-launch gate.

## 4. AI processing

Only server-side functions may contact the configured AI provider. Momentum
intends to send the smallest relevant structured context and a pseudonymous
safety identifier—not an email, password, or unrestricted account record.
Generated nutrition and exercise content is estimated and must pass product
validation before display; it is not professional advice.

Requests are designed to use `store: false`, but that setting must not be
described as Zero Data Retention. OpenAI documents that API abuse-monitoring
logs may be retained for up to 30 days by default; Zero Data Retention or
modified monitoring requires eligibility and approval. The production contract,
retention mode, data region/transfer assessment, and current subprocessor list
must be verified before activation.

AI remains fail-closed behind master/feature switches, confirmed email, and
safety gates. Product region is sticky locale and list currency (`ir` = Persian
and IRR, `intl` = English and USD), not an in-product geo-block. OpenAI's
published country list is an operator checklist before live provider
enablement; it is not shown as an unavailable-market screen. See
[COUNTRY_GO_NO_GO.md](./COUNTRY_GO_NO_GO.md).

## 5. Storage on the device and in the service

Authenticated health/business records are intended to live in PostgreSQL and
private object storage, protected by authorization policies. A device may retain
an authentication session, non-sensitive interface preferences such as language
or theme, and static PWA/browser cache. The isolated Preview uses synthetic demo
data and must not persist health or business records; it may still use those UI
preferences and static caches.

Retention targets and deletion behavior are defined in
[DATA_RETENTION.md](./DATA_RETENTION.md). They are policy targets until automated
expiry, export, deletion, backup reconciliation, and restore tests pass.

## 6. Intended disclosures and processors

Momentum does not intend to sell health data or use it for targeted advertising.
Data may be processed by approved infrastructure, authentication, hosting, AI,
email, payment, security, or support providers only for documented purposes and
under appropriate contracts. The candidate register and activation status are
in [SUBPROCESSORS.md](./SUBPROCESSORS.md).

Data may also be disclosed when legally required or to protect users, the
service, or others, subject to applicable law. Any merger or asset transfer
language requires counsel and user notice appropriate to the jurisdiction.

## 7. International transfers

Provider infrastructure may process data outside the user's country. Before a
market is enabled, Momentum must document the selected Supabase region, AI
processing locations, applicable transfer mechanism, data-processing agreements,
subprocessor chain, and any required impact assessment. UI language, IP-derived
country, self-declared country, billing country, and data-storage region are
separate values and must not be treated as interchangeable consent or legal
authority.

## 8. User choices and rights

Depending on applicable law, users may have rights to access, export, correct,
delete, restrict, object, withdraw consent, or complain to a regulator. Momentum
must provide an authenticated self-service path or a verified support process.
Export and complete account deletion—including private files and session
revocation—must be implemented and tested before public launch. Legal exceptions
and identity-verification procedures must be documented rather than improvised.

## 9. Security and incidents

The intended controls include encryption in transit and provider-managed
encryption at rest, row-level authorization, private storage, least privilege,
server-only secrets, environment separation, redacted logs, backups, restore
drills, access review, and incident response. No system is perfectly secure.
The production hardening checklist, breach-notification analysis, incident
contacts, and response exercises are release gates.

## 10. Adults only

The initial product is restricted to adults aged 18 or older. Accounts detected
as belonging to a minor must not receive automated plans. A future service for
minors requires a separate privacy, consent, age-assurance, safety, and legal
design; it is not covered by this draft.

## 11. Changes and contact

Material changes require a new version, an effective date, appropriate notice,
and re-consent where required. Until `[LEGAL_ENTITY_NAME]`, `[PRIVACY_EMAIL]`,
the applicable law, and a response process are completed, this draft must not
be shown as an effective privacy notice.

## Official references

- [OpenAI API supported countries](https://help.openai.com/en/articles/5347006)
- [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI subprocessor list](https://openai.com/policies/sub-processor-list/)
- [Supabase Data Processing Addendum](https://supabase.com/downloads/docs/Supabase%2BDPA%2B260601.pdf)
- [Supabase privacy policy](https://supabase.com/privacy)
