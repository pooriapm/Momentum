# Momentum brand assets

The canonical source for the current product identity is
`momentum-orbit-master.svg`. All current favicon, PWA, Apple-icon, splash and UI
derivatives must trace back to this vector. `momentum-mark-master.svg` is an
earlier design study retained for reference; it is not the source for new
production exports unless an explicit brand decision replaces Orbit.

## Files

- `momentum-orbit-master.svg`: canonical editable app-mark artwork.
- `momentum-orbit-splash.svg`: current splash derivative.
- `momentum-mark-master.svg` and `momentum-mark-*`: legacy design-study sources.
- `momentum-splash-animated.svg`: legacy self-contained animated splash study.
- `momentum-lockup-horizontal.svg`: legacy editable lockup study.

Edit the Orbit vector first and regenerate derivatives instead of editing PNG
files directly. Export automation and checksum verification are still a launch
gap; see [`docs/design/CONFORMANCE.md`](../../docs/design/CONFORMANCE.md).

## Motion language

The current Orbit motion sequence is: path draw, monogram settle, then satellite
arrival. Motion must remain optional and respect `prefers-reduced-motion`; the
legacy green-mark animation is not the current production reference.
