# Momentum Orbit conformance record

**Assessment date:** 2026-08-01
**Release assessed:** `0.3.0-alpha.0` design foundation
**Result:** **not production-certified**; web implementation is partial and native
deliverables are specification-only.

This file separates the design intent in `docs/design/` from verified artifacts.
Normative language in the design system describes the target release bar; it is
not evidence that the current alpha has already passed it.

## Current conformance matrix

| Area | Target contract | Current evidence | Status / launch gap |
| --- | --- | --- | --- |
| Semantic tokens | `tokens.json` is the platform-neutral reference | JSON reference and web semantic CSS exist | **Partial:** no checked-in generator, checksum, schema validator, contrast manifest, or drift test |
| Color modes | light, dark, high-contrast light/dark | light/dark web themes exist | **Partial:** high-contrast modes and automated pairwise contrast evidence are not complete |
| Materials/glass | glass restricted to functional chrome with opaque fallback | web material rules and CSS implementation exist | **Partial:** capability, reduced-transparency and performance matrix needs recorded QA |
| Components | shared anatomy, variants, interaction and domain states | web primitives/pages and written component contract exist | **Partial:** no complete component-state inventory or visual-regression suite |
| Localization | shared FA/RTL and EN/LTR tree; region is independent | both locale routes and logical-layout guidance exist | **Partial:** translation completeness, long-text, calendar, unit, food and locale fallback evidence remain |
| Accessibility | WCAG-oriented contrast, keyboard, screen reader, scaling and preferences | written requirements and some web semantics exist | **Unverified:** formal audit, assistive-technology matrix, maximum text scale and focus evidence are launch gates |
| Motion | restrained semantic motion with reduced-motion final state | written motion rules and brand motion assets exist | **Partial:** reduced-motion and performance regression evidence is not catalogued |
| Responsive web/PWA | compact through expanded layouts, offline/update/install states | responsive PWA implementation exists | **Partial:** device/browser matrix and recorded install/update/offline QA remain |
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
- Persian RTL and English LTR at compact, medium and expanded widths;
- keyboard-only and visible-focus journey;
- VoiceOver on Safari/iOS and at least one additional screen-reader/browser pair;
- 200% zoom/reflow and the product's maximum supported text scale;
- reduced motion, reduced transparency, increased contrast and forced-colors
  behavior where supported;
- install/update/offline flows on iOS Safari and an Android Chromium browser;
- performance and blur fallback on representative low/mid devices;
- accessible error, loading, empty, blocked-country, quota and safety states.

Each run should record app version, browser/OS/device, locale/direction, theme,
accessibility settings, result, evidence link, defects and owner.

## Native release rule

Native parity means shared semantics and state—not copied HTML/CSS or pixel-
identical system controls. iOS and Android may not be called supported clients
until each has real generated/adapted tokens, component parity records, secure
auth/session storage, API-contract tests, accessibility/device QA, platform
privacy disclosures, and store-specific review. The current repository provides
only a native handoff specification.
