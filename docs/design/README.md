# Momentum Orbit Design System

Status: target product and implementation contract. The current alpha is not
production-certified; see [Conformance](./CONFORMANCE.md) for implemented evidence
and launch gaps.

Momentum Orbit is the shared visual and interaction language for the bilingual
Momentum AI coach. It is designed for the web product first and for later
SwiftUI and Jetpack Compose applications without requiring the native products
to copy web-specific CSS or layouts.

The system is inspired by the hierarchy, adaptivity, and depth of modern glass
interfaces, but it deliberately has its own brand, palette, geometry, and
motion. Glass is a functional navigation material, not decoration applied to
every card.

## Product principles

1. **The next useful action is obvious.** Today, Plan, Coach, and Progress are
   organized around what the user should do next, not around raw data.
2. **Personalization stays explainable.** AI recommendations show the relevant
   user inputs and require confirmation before changing an active plan.
3. **Calm beats intensity.** Momentum should feel credible and supportive,
   avoiding neon fitness clichés, shame, alarming streak mechanics, and noisy
   dashboards.
4. **Language is not region.** UI language, direction, pricing country,
   currency, food culture, calendar, and units are independent preferences.
5. **Accessibility is a mode of the system.** Contrast, reduced transparency,
   reduced motion, text scaling, keyboard access, and screen reader semantics
   are defined with the default design, not added later.
6. **Native parity is semantic.** Platforms share token names, component intent,
   content hierarchy, and state models while retaining native interaction
   conventions.

## Canonical documents

- [Product flows](./product-flows.md): information architecture and screen
  hierarchy.
- [Foundations](./foundations.md): brand, color, type, layout, spacing, shape,
  iconography, and elevation.
- [Token contract](./token-contract.md): token syntax, modes, aliases, and
  validation.
- [Reference tokens](./tokens.json): machine-readable source values.
- [Materials](./materials.md): Momentum glass and content-layer rules.
- [Components](./components.md): component anatomy, variants, behavior, and
  responsive rules.
- [Localization](./localization.md): FA/EN, RTL/LTR, region, calendar, units,
  food locale, and pricing behavior.
- [Accessibility](./accessibility.md): WCAG target and component requirements.
- [Motion](./motion.md): timing, easing, transitions, and reduced-motion rules.
- [Native handoff](./native-handoff.md): CSS, SwiftUI, and Compose mappings.
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
- works in both FA/RTL and EN/LTR without a separate component tree;
- uses glass only in the permitted functional layer;
- passes the QA matrices in these documents;
- preserves platform-native behavior where this contract explicitly allows it.

## Ownership and change control

`tokens.json` is the visual source of truth. A token rename or semantic change
is a breaking design-system change. Primitive value adjustments are compatible
when contrast and visual regression checks continue to pass.

Every component change should include:

1. the user problem and affected states;
2. FA/RTL and EN/LTR examples;
3. light, dark, reduced-transparency, and high-contrast evidence;
4. keyboard, screen-reader, text-scale, and reduced-motion checks;
5. web and native mapping notes when semantics changed.
