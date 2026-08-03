# Product Flows and Information Architecture

## Top-level structure

Momentum has three distinct shells. They must not be merged into one overloaded
navigation model.

### Public shell

| Route | Purpose |
| --- | --- |
| `/fa`, `/en` | Localized landing page |
| `/[locale]/how-it-works` | Explain onboarding, plan generation, and coaching |
| `/[locale]/pricing` | Region-aware plans and feature comparison |
| `/[locale]/safety` | AI, medical, and emergency boundaries |
| `/[locale]/privacy` | Data use, retention, export, and deletion |
| `/[locale]/terms` | Terms of service |
| `/[locale]/auth/sign-up` | Account creation |
| `/[locale]/auth/sign-in` | Account access |
| `/[locale]/auth/verify` | Email/OTP verification |
| `/[locale]/auth/reset-password` | Account recovery |

The landing header may use regular Momentum Glass. Landing content sections
must use solid or standard translucent content materials.

Landing order:

1. value proposition and primary CTA;
2. a realistic preview of Today and Coach;
3. how profile, body composition, and preferences affect the plan;
4. nutrition and training capabilities;
5. privacy, safety, and human-control principles;
6. pricing preview;
7. FAQ and final CTA.

### Onboarding shell

Onboarding is resumable and account-backed. Each step has a stable URL and saves
on successful forward navigation.

| Step | Route | Required outcome |
| --- | --- | --- |
| Welcome | `/onboarding/welcome` | Confirm expected result and time required |
| Locale | `/onboarding/locale` | Language, region, calendar, food locale, units |
| Goal | `/onboarding/goal` | Goal type, target, timeline, experience level |
| Baseline | `/onboarding/baseline` | Age range, sex where relevant, height, weight, activity |
| Safety | `/onboarding/health` | Conditions, injuries, allergies, medications, consent |
| Composition | `/onboarding/body-composition` | Upload, manual entry, or explicit skip |
| Food | `/onboarding/nutrition` | Diet pattern, food preferences, budget, cooking constraints |
| Training | `/onboarding/training` | Schedule, equipment, recovery, limitations |
| Review | `/onboarding/review` | Correct inputs before they reach AI |
| Offer | `/onboarding/offer` | Select entitlement before a paid AI generation |
| Generate | `/onboarding/generating` | Show durable asynchronous job progress |
| Preview | `/onboarding/plan-preview` | Explain, adjust, and accept the initial plan |

The Offer step can be bypassed only by a valid trial, promotional entitlement,
or internal development flag. Payment mechanics may be added later without
changing this information architecture.

Body-composition extraction must always show the source image beside extracted
values and require confirmation. Unreadable values remain empty; the UI must
never imply measurement certainty that the source does not support.

### Authenticated app shell

The five primary destinations are deliberately stable across platforms:

| Key | Persian | English | Route |
| --- | --- | --- | --- |
| `today` | امروز | Today | `/app/today` |
| `plan` | برنامه | Plan | `/app/plan` |
| `coach` | مربی | Coach | `/app/coach` |
| `progress` | پیشرفت | Progress | `/app/progress` |
| `me` | حساب من | Me | `/app/me` |

Calendar is a Plan/Progress view, not a primary destination. Settings and
subscription live under Me. On compact screens Coach may receive a visually
prominent center destination, but it must not be larger than the minimum target
in a way that shifts the other targets or breaks equal access.

## Screen hierarchy

### Today

Order content by decision value:

1. **Daily brief:** date, plan phase, one coach sentence;
2. **Next action:** next meal, workout, recovery task, or check-in;
3. **Today timeline:** meals and training in chronological order;
4. **Quick check-in:** energy, hunger, mood, sleep, weight when scheduled;
5. **Daily totals:** calories/macros, hydration, steps, adherence;
6. **Coach insight:** one evidence-linked observation, not a generic quote.

The first viewport should not contain more than one hero, one primary action,
and four compact metrics. Weight goal progress is secondary to today's behavior.

### Plan

Plan contains segmented views for Week, Nutrition, Training, Grocery, and
Calendar. The default view opens at the current day. A plan change created by AI
is shown as a diff with impact, reason, effective date, and Accept/Reject actions.

Meal cards prioritize meal name, timing, selected option, and completion.
Ingredients, nutrition provenance, substitutions, and recipe steps are disclosed
progressively. Workout cards use the same temporal and state grammar.

### Coach

Coach is a persistent conversation with structured actions, not a generic chat
window. It contains:

- context header showing active goal and plan phase;
- conversation timeline;
- suggested prompts based on the current day;
- composer with text and permitted attachments;
- structured recommendation cards;
- plan-change preview before any mutation;
- clear boundaries for emergencies and professional medical advice.

The assistant must distinguish an explanation, suggestion, and committed plan
change. Only the last requires an explicit user confirmation.

### Progress

Progress defaults to a four-week summary and includes:

- trend rather than isolated weight values;
- waist, body-fat, and muscle timelines when available;
- adherence, recovery, sleep, energy, and training consistency;
- non-scale victories and milestones;
- body-composition records with source and confidence;
- a periodic coach retrospective.

Charts must have a text summary and data-table alternative. Positive/negative
meaning must not rely on red and green alone.

### Me

Me is a hub, not a single long settings form:

- Profile and goals;
- Measurements and body composition;
- Nutrition and training preferences;
- Language, region, calendar, and units;
- Notifications;
- Subscription and billing;
- Coach memory and personalization controls;
- Privacy, export, retention, and account deletion;
- Appearance and accessibility;
- Help, safety, and legal documents.

## Critical state flows

### AI generation

Use durable states: `queued`, `preparing`, `generating`, `validating`, `ready`,
`needs_input`, and `failed`. The UI may show friendly step labels but must not
fake precise completion percentages when the backend cannot provide them.

If generation is interrupted, reopening the app returns to the active job.
Retries must not silently create another billable generation.

### Offline and stale data

The server is authoritative. Cached content may be read offline and clearly
marked with its last sync time. Mutations queue only when conflict behavior is
defined; otherwise controls remain visible but disabled with an explanation.

### Empty and error states

Every empty state must provide one relevant next action. Errors preserve user
input, identify what is safe to retry, and avoid exposing model or infrastructure
details. Health-critical failures use plain language and an alternative path.
