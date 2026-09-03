# Package E/F blockers

## E — Live AI staging eval

- Local FA/EN stub + fail-closed live-provider coverage: `npm run test:r4-provider` and `node scripts/ops/run-r4-staging-eval.mjs`.
- Staging live eval (`--staging`) remains blocked until:
  1. staging project is `active`
  2. `OPENAI_API_KEY`, `OPENAI_PLAN_MODEL`, and owner-approved `MOMENTUM_AI_EVAL_SPEND_CAP_USD` are set
  3. a qualified human signs sport/nutrition safety review (agent must not forge this)

Production `AI_PLAN_LIVE_OPENAI` stays false until those gates pass.

## F — Payments sandbox

- Sandbox adapters: `StripeSandboxAdapter`, `ZarinpalSandboxAdapter` in `supabase/functions/_shared/billing.ts`.
- Webhook inbox dedupe helper: `acceptWebhookOnce`.
- Explicit gap: Zarinpal has no provider-managed recurring tokenization equivalent; code rejects fabricated recurring success.
- Live charges and production activation require `PAYMENTS_MASTER_ENABLED=true` plus provider credentials and explicit owner approval. No live charge is performed by these adapters.
