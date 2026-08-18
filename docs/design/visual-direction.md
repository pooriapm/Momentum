# Momentum Visual Direction — Human Strength + Liquid Glass

Version: 1.1  
Status: Founder-approved visual direction  
Approved: 2026-08-13  
Applies to: Penpot, Storybook, web, and future native design and implementation

This document is the binding visual-direction contract for all new Momentum
design work. When an older mockup, token, component, or document conflicts with
this contract, this contract wins until the canonical token migration is
complete.

## 1. Approved direction

The approved palette is **Human Strength — Deep Plum + Apricot**.

Momentum should feel personal, mature, calm, capable, and warm. It must avoid:

- aggressive gym red/black and fluorescent performance aesthetics;
- sterile medical blue;
- generic health green as the dominant identity;
- blue-violet AI gradients and conversational-AI styling;
- decorative luxury purple or excessive pink styling;
- color that judges weight, calories, missed workouts, or adherence.

Plum provides the durable brand and action identity. Apricot provides human
energy and warmth. Warm neutrals keep content legible and prevent the product
from becoming visually loud or lifestyle-only.

## 2. Approved palette anchors

These values are the approved anchors now expanded into the canonical primitive
scale and semantic state matrix in `tokens.json` schema 3. Feature code must not
consume anchors or primitives directly. Measured pairings and implementation
constraints are recorded in [Color validation](./color-validation.md).

| Role | Light | Dark | Intent |
| --- | --- | --- | --- |
| Canvas | `#FAF7F4` | `#161114` | Warm application environment |
| Content surface | `#FFFFFF` | `#21191E` | Primary opaque reading surface |
| Raised surface | `#F1EAEF` | `#2D2229` | Selected or elevated content |
| Primary text | `#241A21` | `#FBF5F8` | Main reading text |
| Secondary text | `#675762` | `#C2B3BC` | Supporting copy and metadata |
| Brand/action | `#73395F` | `#E0A3C8` | Primary action and active navigation |
| On brand/action | `#FFFFFF` | `#351329` | Foreground over the primary action |
| Brand soft | `#F3E1EC` | `#48283A` | Selected and low-emphasis brand state |
| Human-energy accent | `#B95332` | `#FF9A73` | Energy, milestones, food, illustration |
| Energy soft | `#FBE4DA` | `#4B261D` | Warm, low-emphasis supporting state |
| Control boundary | `#7C6A75` | `#806D78` | Field and control separation |

Measured reference combinations exceed WCAG 2.2 AA in the approved preview:

- primary text/canvas: approximately `15.81:1` Light and `17.36:1` Dark;
- secondary text/canvas: approximately `6.31:1` Light and `9.31:1` Dark;
- action foreground/action fill: approximately `8.47:1` Light and `8.02:1` Dark.

Every final component pairing must still be tested against its actual composited
surface. These measurements do not authorize arbitrary opacity changes.

## 3. Color behavior

- Light and Dark are separately authored appearances, not mathematical
  inversions.
- Plum is the default interactive tint. A screen normally has one visually
  dominant primary action.
- Apricot is a supporting accent, not a second default CTA color.
- Apricot must not replace warning or error semantics.
- Error uses a distinct red/crimson family and always includes text or an icon.
- Success, warning, error, information, and chart categories retain independent
  semantic roles.
- Color is never the sole carrier of selection, progress, success, or failure.
- Weight change, calorie balance, missed activity, and incomplete adherence are
  neutral data unless a professionally defined safety rule says otherwise.
- Gradients may use the approved families only for restrained environment aura,
  illustration, generation progress, or a subtle CTA sheen. A purple-blue AI
  gradient is prohibited.
- All application components consume semantic names such as
  `action.primary`, `surface.content`, and `status.warning`, never palette names
  such as `plum500` outside the token layer.

## 4. Liquid Glass interpretation

Momentum follows Apple's Liquid Glass principles as a hierarchy and material
model, not as a decorative blur effect.

Liquid Glass is the topmost **Function** layer. It helps navigation and temporary
controls remain distinct while allowing the underlying content environment to
influence the material.

### Permitted

- authenticated bottom navigation, rail, or sidebar;
- top navigation and compact sticky toolbars;
- popovers, menus, and temporary contextual controls;
- sheets and action surfaces where the platform convention calls for material;
- a public header over intentionally composed landing media;
- prominent glass button treatment only when hierarchy and contrast remain
  clear;
- transient interactive parts of sliders, segmented controls, or toggles;
- localized, interaction-only highlight/refraction on a pressed or dragged
  functional glass control;
- connected shape blending/morphing from a source control into its own menu,
  popover, or compact sheet and back.

### Prohibited

- default plan, meal, workout, progress, pricing, and metric cards;
- form fields and onboarding question panels;
- charts, tables, long explanations, consent, safety, and destructive dialogs;
- full-page glass backgrounds;
- nested or overlapping glass that is not one coordinated source-linked group;
- decorative glass applied only to make a screen feel futuristic;
- idle shimmer, animated noise, continuous/autonomous refraction, or highlights
  that follow the cursor outside the actively manipulated control.

Content cards remain opaque. This is a health and planning product, so reading
clarity takes priority over material spectacle. The expressive behavior requested
for the approved preview must be visible in functional chrome and transitions,
not simulated by making the whole screen translucent.

## 5. Liquid Glass optical contract

Custom web approximations must:

- blur content behind the material, never its child content;
- clip the effect to a concentric rounded shape;
- combine an adaptive translucent tint, restrained saturation, an asymmetric
  specular edge, and restrained elevation;
- let approved environment colors lightly influence the material without
  tinting every control plum;
- strengthen separation when content scrolls beneath navigation;
- render a legible solid fallback before backdrop filtering is available;
- avoid crowding, overlap, and glass-on-glass stacking;
- retain predictable icon placement and a minimum 44×44 interactive target;
- keep text and symbols legible against the final composited background;
- show a localized optical response on press/drag and a connected morph for a
  source-linked menu, popover, or compact sheet;
- remain optically stable at rest.

Momentum provides four semantic material roles:

- **Regular:** default navigation, toolbar, menu, and popover material;
- **Prominent:** one hierarchy-critical action surface, with controlled Deep
  Plum tint and an optional brief Apricot interaction highlight;
- **Clear:** a minimal-tint floating control over a bounded media/aura backdrop,
  always with an explicit legibility treatment;
- **Fallback:** opaque equivalent for accessibility, unsupported rendering,
  unknown contrast, or performance degradation.

All four share the same functional hierarchy. Regular, Prominent, and Clear
must include backdrop sampling, optical edge/depth, and the interaction response
defined in [Materials](./materials.md); a static blur alone is nonconforming.

On Apple platforms, standard navigation, toolbar, sheet, popover, menu, and
control APIs take priority over hand-built glass. The system owns refraction,
blur, highlight, morphing, and platform adaptation; Momentum supplies semantic
tint, content hierarchy, and brand identity. Apple's guidance specifically
describes the material as a distinct functional layer, recommends sparse use,
and provides interactive and container-based morphing for custom controls:
[Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass),
[Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views).

Liquid Glass must preserve the same functional hierarchy on non-Apple
platforms, but it does not require pixel imitation of Apple rendering.

## 6. Accessibility and adaptability

- Reduced Transparency replaces glass with an opaque semantic fallback.
- Increased Contrast strengthens boundaries and selected states inside Light or
  Dark; it is not a third color theme.
- Reduced Motion removes elastic deformation, contact-following optical travel,
  blending, and material morphing. A brief opacity/tint state change may remain.
- Bold Text, text scaling, Persian glyph density, and mixed numeric content must
  not clip or reduce control targets.
- If contrast depends on unknown scrolling content, use a scroll-edge treatment
  or the opaque fallback.
- Blur and translucency are enhancement layers; no task, state, or hierarchy may
  depend on them.
- Low-performance or unsupported web environments may use the opaque fallback
  without losing information or interaction.

## 7. Content and localization implications

- Persian and English share the same palette and semantic component system.
- Technical writing-direction terminology is never user-facing.
- Layout follows reading direction automatically, while universal symbols and
  the Momentum mark do not mirror.
- Longer Persian copy must be accommodated with intrinsic height rather than
  tighter padding or smaller type.
- Mixed numbers, units, dates, and names remain isolated and legible on both
  opaque and glass materials.

## 8. Governance and rollout

The required rollout order is:

1. expand these anchors into complete primitive and semantic Light/Dark tokens;
2. validate action, label, boundary, focus, status, and chart contrast;
3. apply the system to Penpot foundations and components;
4. obtain visual approval for representative Persian and English screens;
5. synchronize Storybook and token documentation;
6. only after final Penpot and Storybook approval, authorize production-code
   migration.

For the v1.1 expressive update, steps 1–2 are complete in this contract and the
canonical schema 3.1 token source. Steps 3–5 are reopened: Penpot and Storybook
must add the four material roles, named anatomy, interaction sequences, and
reduced paths before the direction can return to founder review. Step 6 remains
locked: no production-code migration is authorized until the founder explicitly
approves the final Penpot and Storybook outputs.

Until step 6, no palette or Liquid Glass decision in this document authorizes a
production application change. Existing indigo/violet/coral implementation and
mockups are superseded references and must not guide new design work.

Any future proposal that changes the approved brand family, assigns Apricot as
the default primary action, expands glass into content surfaces, or removes an
accessibility fallback requires explicit founder approval and a version update
to this document.

The approved expressive update does not authorize constant visual motion. Its
signature is causality: the glass bends, highlights, and morphs because the user
pressed, dragged, scrolled, opened, or closed a control, then returns to a calm
resting state.

## 9. Source guidance

- [Apple — Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [Apple — Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [Apple — Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [Apple — Glass clear](https://developer.apple.com/documentation/swiftui/glass/clear)
- [Apple — Glass Effect Container](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
- [Apple HIG — Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple HIG — Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
