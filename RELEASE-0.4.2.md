# Momentum 0.4.2

Release date: 2026-09-17

This patch release strengthens the onboarding journey before plan generation, with a focus on data integrity, accessibility, recovery, and user trust.

## Highlights

- Added resilient language detection, clearer sign-in recovery, improved email verification controls, and more accurate gift availability messaging.
- Tightened onboarding validation for localized decimals, dates, times, countries, select options, text limits, and input step values.
- Removed stale hidden answers from submitted data and enforced dependencies between goals, target weight, activity, training days, restaurant frequency, and body-report consent.
- Improved keyboard and screen-reader behavior for country, date, and time controls, plus narrow-screen review layouts and dark-mode contrast.
- Preserved draft edits more reliably across in-app navigation and delayed authentication, while making upload, deletion, offline, and save failures explicit.
- Revalidated every required section at final confirmation and removed automatic activation of a generic plan. Users now explicitly start plan generation.
- Expanded managed plan-generation context to include training location/history, mobility limits, restaurant and shopping preferences, and workout-time notes. The request schema is now `1.1.0`.
- Added server-side blocking for urgent symptoms and database coverage for repeated confirmation after draft edits.

## Release notes

- The database migration `supabase/migrations/202609160001_preserve_onboarding_generation_context.sql` must be applied before deploying server functions that select the new columns.
- Payment remains disabled. Hosted email delivery, production database policies, Safari/iPhone behavior, assistive technology, and generated-plan quality still require separate production validation.
- Pre-release checks recorded for this change set: 545 unit/integration tests across 94 files, lint, production build, and 9 focused browser journeys passed. All 19 onboarding database assertions also passed against the isolated staging database in a rolled-back transaction with the new migration.
