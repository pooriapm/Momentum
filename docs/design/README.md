# Momentum Orbit Design System

Status: target product and implementation contract. The current alpha is not
production-certified; see [Conformance](./CONFORMANCE.md) for implemented evidence
and launch gaps.

Momentum Orbit is the shared visual and interaction language for the Persian
and English Momentum fitness and nutrition product. It is designed for the web product first and for later
SwiftUI and Jetpack Compose applications without requiring the native products
to copy web-specific CSS or layouts.

The system follows Apple Human Interface Guidelines as its primary interaction
reference: clear hierarchy, native-feeling controls, generous breathing room,
legible typography, direct manipulation, and restrained depth. Momentum retains
its own identity and must not imitate Apple assets or screens literally. Glass
is a functional navigation material, not decoration applied to every card.

The indigo/violet/coral palette is deprecated. No new product screen may
be finalized against it. **Human Strength — Deep Plum + Apricot** is the
founder-approved visual direction. Its Light/Dark semantic palette, state matrix,
and functional Liquid Glass materials are canonical in [Reference tokens](./tokens.json),
with policy in [Visual direction](./visual-direction.md). Penpot and Storybook
must implement the same semantic roles before production-code migration.

**Next design work:** exceptions in [HANDOFF.md](./HANDOFF.md) (Penpot clips, Forced Colors). Implementation sequencing:
[AGENT-DEVELOPMENT-PLAN.md](../AGENT-DEVELOPMENT-PLAN.md). Step 5 freeze is
[signed 2026-08-18](./STEP-5-FREEZE.md).

## Product principles

1. **The next useful action is obvious.** Today, Plan, Progress, and Me are
   organized around what the user should do next, not around raw data.
2. **Personalization stays explainable.** A monthly plan records the inputs and
   prior-period outcomes used to create it. There is no AI chat or coach persona.
3. **Calm beats intensity.** Momentum should feel credible and supportive,
   avoiding neon fitness clichés, shame, alarming streak mechanics, and noisy
   dashboards.
4. **Two product versions.** Sticky `product_region` chooses Persian+IRR or
   English+USD. Calendar, units, and cuisine stay independent. IP does not
   change a saved account region. There is no geo-block.
5. **Accessibility is a mode of the system.** Contrast, reduced transparency,
   reduced motion, text scaling, keyboard access, and screen reader semantics
   are defined with the default design, not added later.
6. **Native parity is semantic.** Platforms share token names, component intent,
   content hierarchy, and state models while retaining native interaction
   conventions.

## Canonical documents

- [Product flows](./product-flows.md): information architecture and screen
  hierarchy.
- [Screen and state inventory](../product/SCREEN-STATE-INVENTORY.md): exact
  132-state coverage ledger and eight required clickable flows.
- [Foundations](./foundations.md): brand, color, type, layout, spacing, shape,
  iconography, and elevation.
- [Visual direction](./visual-direction.md): approved Human Strength palette,
  expressive Liquid Glass contract, interaction boundary, accessibility behavior,
  and rollout precedence.
- [Token contract](./token-contract.md): token syntax, modes, aliases, and
  validation.
- [Reference tokens](./tokens.json): machine-readable source values.
- [Materials](./materials.md): Regular/Prominent/Clear/Fallback anatomy,
  interaction response, and content-layer rules.
- [Color validation](./color-validation.md): canonical Human Strength scales,
  contrast manifest, chart rules, interaction states, and glass limitations.
- [Components](./components.md): component anatomy, variants, behavior, and
  responsive rules.
- [Design handoff](./HANDOFF.md): freeze, 2026-08-17 UI table, Penpot/Storybook rules. Signature: [STEP-5-FREEZE.md](./STEP-5-FREEZE.md).
- [Localization](./localization.md): Persian/English, direction, region, calendar, units,
  food locale, and pricing behavior.
- [Accessibility](./accessibility.md): WCAG target and component requirements.
- [Motion](./motion.md): timing, press/drag/source-linked glass transitions,
  general transitions, and reduced-motion rules.
- [Native handoff](./native-handoff.md): CSS, SwiftUI, and Compose mappings.
- [Step 4 responsive/a11y](./STEP-4-RESPONSIVE-A11Y.md): Storybook 320/375 evidence closed; Penpot clip wrappers and Forced Colors remain exceptions.
- [Conformance](./CONFORMANCE.md): current web evidence, known gaps, canonical
  brand source, and native implementation status.

## Conformance language

The words **must**, **must not**, **should**, and **may** are normative:

- **must / must not**: required for a Momentum production surface;
- **should**: default choice that needs a documented reason to override;
- **may**: optional behavior.

An implementation conforms to Momentum Orbit when it:

- consumes semantic tokens rather than primitive palette values;
- implements all relevant interaction and accessibility states;
- works in Persian and English without a separate component tree or user-facing
  technical direction labels;
- uses expressive glass only in the permitted functional layer, with a calm rest
  state and causal press/drag/source-linked motion;
- passes the QA matrices in these documents;
- preserves platform-native behavior where this contract explicitly allows it.

A design handoff is complete only when every Inventory ID has named Penpot and
Storybook evidence and all eight prototypes pass. Component specimens and state
labels cannot substitute for composed screens and transitions.

## Ownership and change control

`tokens.json` is the visual source of truth. A token rename or semantic change
is a breaking design-system change. Primitive value adjustments are compatible
when contrast and visual regression checks continue to pass.

Every component change should include:

1. the user problem and affected states;
2. Persian and English examples;
3. Light, Dark, and reduced-transparency evidence; increased-contrast behavior
   strengthens boundaries inside those appearances and is not a separate theme mode;
4. keyboard, screen-reader, text-scale, and reduced-motion checks;
5. web and native mapping notes when semantics changed.
