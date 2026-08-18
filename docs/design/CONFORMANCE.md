# Momentum Orbit conformance record

**Assessment date:** 2026-08-13
**Release assessed:** `0.3.0-alpha.0` design foundation
**Result:** **not production-certified**; web implementation is partial and native
deliverables are specification-only.

This file separates the design intent in `docs/design/` from verified artifacts.
Normative language in the design system describes the target release bar; it is
not evidence that the current alpha has already passed it.

## Current conformance matrix

| Area | Target contract | Current evidence | Status / launch gap |
| --- | --- | --- | --- |
| Semantic tokens | `tokens.json` is the platform-neutral reference | schema 3 Human Strength reference, documented contrast manifest, and one-time JSON/alias/mode validation exist | **Partial:** no checked-in generator, checksum, executable schema validator, CI contrast test, or drift test |
| Color appearances | Human Strength — Deep Plum + Apricot; Light and Dark only | canonical tokens, measured pairings, Penpot V3 themes, and Storybook specimens exist; current web themes still use the superseded palette | **Design artifacts ready / production migration locked:** founder review of the V2 design source is required before changing the application |
| Materials/glass | Regular/Prominent/Clear/Fallback restricted to functional chrome; visible localized press/drag optics and source-linked morph; stable at rest | approved v1.1 contract and canonical schema 3.1 tokens exist; the checked-in Penpot token export still reports schema 3.0 and current Penpot/Storybook require state-sequence verification | **Design revision required:** regenerate/sync the Penpot export, then pass instance, interaction, reduced-motion/transparency, composite-contrast, interruption, and performance audits |
| Components and screens | canonical component catalog plus 132 composed semantic states | written catalog, exact Inventory and Storybook/Penpot evidence contract exist | **Verification required:** pass only after ID, instance/variant and screenshot/story coverage audits |
| Localization | shared FA/RTL and EN/LTR tree; region is independent | both locale routes and logical-layout guidance exist | **Partial:** translation completeness, long-text, calendar, unit, food and locale fallback evidence remain |
| Accessibility | WCAG-oriented contrast, keyboard, screen reader, scaling and preferences | written requirements and some web semantics exist | **Unverified:** formal audit, assistive-technology matrix, maximum text scale and focus evidence are launch gates |
| Motion | restrained semantic motion plus causal Liquid Glass press/drag/source-linked response and a calm idle state | v1.1 motion tokens and written sequences exist | **Partial:** Penpot sequence/prototype and executable Storybook recordings, interruption, reduced-motion, and performance evidence remain |
| Responsive product design | 320-min/390 Compact, 768 Medium, 1440 Expanded plus offline/stale/error states | Compact 390 boards exist; Medium/Expanded pairings exist; Storybook viewports `compact320`/`compact375` exist; Penpot Compact-320/375 wrappers at rev 222 are leftover clip frames and are **not** 320 reflow evidence | **Verification required:** real 320 reflow and 375×667 Today above-fold remain open |
| iOS | semantic SwiftUI mapping and Apple-style material adaptation | `native-handoff.md` specification only | **Not implemented:** no Swift package, generated tokens, native components, app, or tests |
| Android | semantic Compose/Material 3 mapping | `native-handoff.md` specification only | **Not implemented:** no Kotlin tokens, theme/components, app, or tests |
| Brand assets | one canonical editable vector plus approved derivatives | current Orbit master, splash and PWA exports exist | **Partial:** export automation, checksum, safe-area/icon QA and designer approval remain |

## Canonical brand source

The current product identity has one canonical editable source:

`public/brand/momentum-orbit-master.svg`

`momentum-orbit-splash.svg`, favicon/PWA/Apple raster files, and UI renderings are
derivatives. `momentum-mark-master.svg` and assets based on it are an earlier
brand study retained for reference; they must not be used to regenerate the
current production icon unless an explicit brand decision replaces the Orbit
master. Never edit a raster derivative as the source of truth.

The brand README must remain aligned with this decision. A future designer handoff
should preserve named vector layers or migrate the approved geometry into a
documented Figma/Illustrator source without silently changing the canonical mark.

## Token-generation boundary

`tokens.json` is currently a **reference and handoff contract**, not a functioning
cross-platform build pipeline. The paths shown in `native-handoff.md` are planned
outputs. Do not claim that CSS, SwiftUI, or Compose themes are generated until a
deterministic tool is checked in and CI proves:

1. schema/type/mode/alias validation;
2. canonical serialization and source checksum;
3. CSS/Swift/Kotlin output generation from the same commit;
4. semantic contrast-manifest checks;
5. no hand-edited drift in generated files;
6. versioning and deprecation behavior.

Until then, web CSS and the JSON reference must be reviewed together on every
semantic token change.

## Evidence required for web certification

- token validation and design/CSS drift check in CI;
- component-state snapshots in light/dark and relevant contrast/transparency
  settings;
- glass Rest/Pressed/Dragging/Released and source-linked Open/Close recordings,
  including rapid cancellation/reversal and no idle optical movement;
- Persian RTL and English LTR at compact, medium and expanded widths;
- keyboard-only and visible-focus journey;
- VoiceOver on Safari/iOS and at least one additional screen-reader/browser pair;
- 200% zoom/reflow and the product's maximum supported text scale;
- reduced motion, reduced transparency, increased contrast and forced-colors
  behavior where supported;
- install/update/offline flows on iOS Safari and an Android Chromium browser;
- performance and blur fallback on representative low/mid devices;
- accessible error, loading, empty, sticky-region, quota and safety states.

Each run should record app version, browser/OS/device, locale/direction, theme,
accessibility settings, result, evidence link, defects and owner.

## Design handoff certification

Before production migration, the design-specific gate additionally requires:

- all 132 Inventory IDs found exactly once in the canonical Penpot index and at
  least once in deterministic Storybook metadata/docs;
- all eight prototype flows passing graph/orphan/dead-end review;
- every reusable screen control using current component instances/variants and
  semantic token bindings;
- no legacy palette/theme/board, user-facing direction term, tier ladder,
  coach/chat surface or separate body-AI flow;
- owner-approved defect closure and explicit removal of the production-code lock.

Until those artifacts are audited, documentation can describe the target but
must not claim the full product design is complete.

## Native release rule

Native parity means shared semantics and state—not copied HTML/CSS or pixel-
identical system controls. iOS and Android may not be called supported clients
until each has real generated/adapted tokens, component parity records, secure
auth/session storage, API-contract tests, accessibility/device QA, platform
privacy disclosures, and store-specific review. The current repository provides
only a native handoff specification.
