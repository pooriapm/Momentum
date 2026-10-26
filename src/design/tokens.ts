// Generated from docs/design/tokens.json by scripts/design/build-css-tokens.mjs. Do not edit.

/** Media queries for the window classes. CSS uses the same strings; tests keep them in step. */
export const media = {
  narrow: '(max-width: 22.49rem)',
  compact: '(max-width: 37.49rem)',
  mediumDown: '(max-width: 52.49rem)',
  expandedDown: '(max-width: 74.99rem)',
  mediumUp: '(min-width: 37.5rem)',
  expandedUp: '(min-width: 52.5rem)',
  largeUp: '(min-width: 75rem)',
} as const

export const zIndex = {
  sticky: 10,
  nav: 20,
  banner: 25,
  dropdown: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  splash: 100,
} as const

/** Milliseconds. */
export const duration = {
  instant: 0,
  fast: 160,
  standard: 260,
  emphasis: 400,
  slow: 600,
  glassPress: 80,
  glassRelease: 260,
  glassMorph: 320,
} as const
