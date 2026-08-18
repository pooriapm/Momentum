# Human Strength Color Validation

Version: 1.0  
Validated: 2026-08-13  
Canonical source: `tokens.json` schema 3.0.0

This document is the implementation manifest for the approved Human Strength
palette. It records stable token pairings, not permission to combine arbitrary
foregrounds, opacities, and surfaces.

## Primitive architecture

- `neutral`: warm canvas, content, field, boundary, and dark-surface scale;
- `plum`: brand, primary action, selection, plan identity, and focus;
- `apricot`: restrained human energy, food, movement, and milestones;
- `green`: success only;
- `amber`: warning only;
- `crimson`: danger and destructive states only;
- `blue`: neutral information and one chart category only;
- `alpha`: optical effects and scrims, never standalone text colors.

The retired Indigo, Violet, Coral, Teal, and Red token families are removed,
not aliased. New components consume semantic roles so the reset cannot be
bypassed through old palette names.

## Required text and control pairings

Ratios use WCAG 2.2 relative luminance. Text pairings require at least `4.5:1`;
large text and graphical boundaries require at least `3:1`.

| Foreground / background | Light | Dark | Requirement |
| --- | ---: | ---: | ---: |
| `text.primary` / `background.canvas` | 15.81 | 17.36 | 4.5 |
| `text.secondary` / `background.canvas` | 6.31 | 9.31 | 4.5 |
| `text.tertiary` / `background.canvas` | 4.71 | 6.04 | 4.5 |
| `text.primary` / `surface.content` | 16.87 | 15.97 | 4.5 |
| `text.secondary` / `surface.content` | 6.74 | 8.56 | 4.5 |
| `action.onPrimary` / `action.primary` | 8.47 | 8.02 | 4.5 |
| `action.onPrimary` / `action.primaryHover` | 11.28 | 10.54 | 4.5 |
| `action.onPrimary` / `action.primaryPressed` | 16.45 | 5.49 | 4.5 |
| `action.onSecondary` / `action.secondary` | 6.77 | 8.20 | 4.5 |
| `border.control` / `surface.content` | 5.03 | 3.58 | 3.0 |
| `focus.ring` / `surface.content` | 8.47 | 8.38 | 3.0 |

The focus ring uses a three-point offset. When it surrounds a Plum primary
action, the intervening surface-colored gap is mandatory so the ring does not
merge into the fill.

## Status pairings

Status foregrounds include a matching icon and explicit label. They are never
assigned from generic health data or adherence outcomes.

| Foreground / soft background | Light | Dark | Requirement |
| --- | ---: | ---: | ---: |
| `status.success` / `status.successSoft` | 4.79 | 7.01 | 4.5 |
| `status.warning` / `status.warningSoft` | 4.99 | 8.05 | 4.5 |
| `status.danger` / `status.dangerSoft` | 4.81 | 6.30 | 4.5 |
| `status.info` / `status.infoSoft` | 4.85 | 6.46 | 4.5 |

Apricot is deliberately outside the status system. `energy.primary` passes
`4.53:1` on the Light canvas and `9.00:1` on the Dark canvas, but only `3.96:1`
on its Light soft surface. Therefore it must not render normal-size explanatory
text on `energy.soft`; use `text.primary` there and reserve Apricot for icons,
large values, progress marks, and decoration.

## Data visualization

Six series are provided in the canonical order: Plum, Apricot, Blue, Green,
Amber, and Crimson. Color is not enough to distinguish them. The descriptions
in `tokens.json` bind each series to a different line pattern and marker.

- show direct labels or a persistent legend;
- use at least a two-point stroke for primary data;
- test every series at `3:1` against the actual plot surface;
- do not use Crimson to imply danger or Green to imply success unless the chart
  explicitly encodes those semantics;
- use `data.referenceLine` only with a visible label;
- preserve the same series-to-dataset assignment across Light and Dark.

The canonical series pass `3:1` against `surface.content` in both appearances.
Dense charts, overlapping fills, alpha areas, and mixed-media plots still need
component-level compositing tests.

## Liquid Glass

`material.glassRegular` is the default Function-layer material.
`material.glassProminent` is restricted to one hierarchy-critical floating
control or a platform-conventional action surface. `material.glassClear` is
restricted to a bounded media/aura backdrop with an explicit local dimming or
contrast treatment. All point to the same required `surface.glassFallback`
opaque replacement.

During direct interaction, `surface.glassInteractionPrimary` supplies a local
Deep Plum response and `surface.glassInteractionEnergy` may supply a brief
Apricot highlight. They are composited effects clipped to the active control,
not foreground colors, persistent fills, or state-only signals.

Token values define a web approximation, not a promise that translucency is
readable over arbitrary content. Before shipping a glass component, validate:

1. foreground contrast against the final composited result in Light and Dark;
2. scrolled-content extremes, including photos and chart colors;
3. the opaque fallback before backdrop filtering loads;
4. Reduced Transparency with `material.glassFallback`;
5. Increased Contrast by replacing subtle boundaries with `border.strong`
   inside the active Light or Dark appearance;
6. Clear against its bounded backdrop and dimming treatment;
7. pressed/dragged states with interaction tints at their maximum composited
   opacity;
8. Reduced Motion without material morphing, contact-following refraction, or
   elastic deformation.

If the underlying content cannot be bounded, use Regular/Prominent or the opaque
fallback; never Clear. Blur,
saturation, and highlight borders never carry state or hierarchy by themselves.

## Validation commands

The canonical build must parse as JSON, resolve every alias, provide both Light
and Dark values for semantic colors, shadows, and materials, and execute this
contrast manifest. A failure blocks Penpot, Storybook, and implementation token
exports. High Contrast is not a mode and must never appear in the mode list.
