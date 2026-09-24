/**
 * Design tokens for the exported recap graphics.
 *
 * These are LITERAL values, deliberately not `hsl(var(--…))` from
 * src/styles/theme.css.
 *
 * The graphics are rendered in an admin's browser and captured to a PNG. If
 * they read theme variables, the same Publish button would produce a different
 * image depending on that admin's operating-system dark mode and on the month —
 * this app ships a seasonal winter theme that overrides --primary. A published
 * league graphic has to look the same whoever made it and whenever.
 *
 * Colours come from the `cornhole` palette (`--color-cornhole-*` in src/index.css).
 */

export const RECAP_GRAPHIC_WIDTH = 1080;
export const RECAP_GRAPHIC_HEIGHT = 1350;

export const recapColors = {
  navy: '#1E3A5F',
  navyDeep: '#152C48',
  cream: '#F9F5E7',
  green: '#2C5530',
  wood: '#9E7E5A',
  white: '#FFFFFF',
  /** Rules and dividers on the navy field. */
  hairline: 'rgba(249, 245, 231, 0.18)',
  /** Secondary text on the navy field. */
  muted: 'rgba(249, 245, 231, 0.62)',
  rise: '#4ADE80',
  fall: '#F87171',
} as const;

/**
 * Self-hosted families, declared in src/styles/fonts.css and embedded into the
 * PNG by the export hook. Quoted names match the @font-face declarations.
 */
export const recapFonts = {
  display: "'Bebas Neue', Impact, sans-serif",
  heading: "'Oswald', 'Bebas Neue', sans-serif",
  body: "'Inter', system-ui, sans-serif",
  numeric: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export const recapSpacing = {
  gutter: 72,
  blockGap: 40,
} as const;
