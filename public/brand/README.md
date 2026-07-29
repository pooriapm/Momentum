# Momentum brand assets

The master source is `momentum-mark-master.svg`. Its groups and paths remain
named and editable so a designer can open it in Figma, Illustrator, Sketch or
Affinity Designer without tracing raster artwork.

## Files

- `momentum-mark-master.svg`: primary app-tile artwork and designer hand-off.
- `momentum-mark-maskable.svg`: full-bleed source for PWA and iOS masks.
- `momentum-mark-on-light.svg`: transparent version for light surfaces.
- `momentum-mark-monochrome.svg`: single-color production variant.
- `momentum-splash-animated.svg`: self-contained animated splash asset.
- `momentum-lockup-horizontal.svg`: editable mark, wordmark and Persian tagline.

The product uses the same geometry through
`src/components/brand/MomentumLogo.tsx`. Raster PWA and Apple icons are exports
of the SVG master; edit the vector first and regenerate them instead of editing
PNG files directly.

## Motion language

The premium motion sequence is: orbit reveal, continuous-M draw, orbital point
settle, then one restrained pulse. Motion must remain optional and respect
`prefers-reduced-motion`.
