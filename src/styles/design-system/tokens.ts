/**
 * Unified Design Tokens
 * Premium design system with consistent visual language
 */

// RADIUS SYSTEM: Only 3 values allowed
export const radius = {
  card: 'rounded-card', // 12px - Cards, dialogs, sheets, alerts
  input: 'rounded-input', // 10px - Buttons, inputs, selects, tabs
  pill: 'rounded-pill', // 9999px - Badges, tags, chips
} as const;

// SHADOW LANGUAGE: Cards = border only, overlays = shadow
export const shadows = {
  none: 'shadow-none', // Default cards (rely on border)
  overlay: 'shadow-lg', // Dialogs, dropdowns, popovers
  toast: 'shadow-xl', // Toasts (highest elevation)
} as const;

// BORDER: Single neutral color, 1px only
export const borders = {
  default: 'border border-border', // Standard border
} as const;

// SPACING: 8pt grid only (in Tailwind units)
export const spacing = {
  0: '0', // 0px
  1: '1', // 4px (half step, acceptable)
  2: '2', // 8px
  3: '3', // 12px (half step, acceptable)
  4: '4', // 16px
  6: '6', // 24px
  8: '8', // 32px
  10: '10', // 40px
  12: '12', // 48px
  16: '16', // 64px
} as const;

// Component-specific tokens
export const componentTokens = {
  card: {
    base: 'rounded-card border border-border bg-card shadow-none',
    interactive:
      'rounded-card border border-border bg-card shadow-none hover:shadow-md cursor-pointer',
  },
  dialog: {
    content: 'rounded-card border border-border bg-background shadow-lg',
  },
  popover: {
    content: 'rounded-card border border-border bg-popover shadow-lg',
  },
  dropdown: {
    content: 'rounded-card border border-border bg-popover shadow-lg',
  },
  input: {
    base: 'rounded-input border border-input bg-background',
  },
  button: {
    base: 'rounded-input',
  },
  toast: {
    base: 'rounded-card border border-border bg-background shadow-xl',
  },
  tooltip: {
    content: 'rounded-input border border-border bg-popover shadow-md',
  },
  tabs: {
    trigger: 'rounded-input',
  },
  alert: {
    base: 'rounded-card border border-border',
  },
} as const;
