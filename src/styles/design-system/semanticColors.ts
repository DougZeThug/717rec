/**
 * Semantic Color Mapping Guide
 * 
 * This file documents the migration from hard-coded Tailwind colors
 * to semantic design tokens. Use this as a reference when updating components.
 * 
 * IMPORTANT: All semantic tokens automatically adapt to light/dark mode.
 */

/**
 * Background color migrations
 * Replace hard-coded backgrounds with semantic tokens
 */
export const backgroundMigrations = {
  // Light backgrounds
  "bg-white": "bg-background",
  "bg-gray-50": "bg-muted",
  "bg-gray-100": "bg-muted",
  "bg-slate-50": "bg-muted",
  "bg-slate-100": "bg-muted",
  
  // Dark backgrounds (used in dark mode sections)
  "bg-gray-800": "bg-card",
  "bg-gray-900": "bg-background",
  "bg-slate-800": "bg-card",
  "bg-slate-900": "bg-background",
  
  // Interactive surfaces
  "hover:bg-gray-50": "hover:bg-muted",
  "hover:bg-gray-100": "hover:bg-accent",
  "hover:bg-gray-800": "hover:bg-accent",
  "dark:bg-gray-800": "bg-card (auto-adapts)",
  "dark:bg-gray-900": "bg-background (auto-adapts)",
} as const;

/**
 * Text color migrations
 * Replace hard-coded text colors with semantic tokens
 */
export const textMigrations = {
  // Primary text
  "text-white": "text-foreground (or text-primary-foreground on primary bg)",
  "text-black": "text-foreground",
  "text-gray-900": "text-foreground",
  "text-gray-800": "text-foreground",
  "text-gray-700": "text-foreground",
  "text-slate-900": "text-foreground",
  "text-slate-800": "text-foreground",
  
  // Muted/secondary text
  "text-gray-400": "text-muted-foreground",
  "text-gray-500": "text-muted-foreground",
  "text-gray-600": "text-muted-foreground",
  "text-slate-400": "text-muted-foreground",
  "text-slate-500": "text-muted-foreground",
  "text-slate-600": "text-muted-foreground",
  
  // Dark mode text (usually can be removed with semantic tokens)
  "dark:text-white": "text-foreground (auto-adapts)",
  "dark:text-gray-100": "text-foreground (auto-adapts)",
  "dark:text-gray-300": "text-muted-foreground (auto-adapts)",
  "dark:text-gray-400": "text-muted-foreground (auto-adapts)",
} as const;

/**
 * Border color migrations
 * Replace hard-coded borders with semantic tokens
 */
export const borderMigrations = {
  // Light mode borders
  "border-gray-200": "border-border",
  "border-gray-300": "border-border",
  "border-slate-200": "border-border",
  "border-slate-300": "border-border",
  
  // Dark mode borders (can be removed with semantic tokens)
  "border-gray-700": "border-border (auto-adapts)",
  "border-gray-800": "border-border (auto-adapts)",
  "dark:border-gray-700": "border-border (auto-adapts)",
  "dark:border-gray-800": "border-border (auto-adapts)",
} as const;

/**
 * Common component patterns
 * Standard replacements for frequently used combinations
 */
export const componentPatterns = {
  // Cards
  card: {
    before: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    after: "bg-card border-border",
  },
  
  // Tooltips and popovers
  tooltip: {
    before: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white",
    after: "bg-popover border-border text-popover-foreground",
  },
  
  // Muted sections
  mutedSection: {
    before: "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400",
    after: "bg-muted text-muted-foreground",
  },
  
  // Table rows with hover
  tableRow: {
    before: "hover:bg-gray-50 dark:hover:bg-gray-800",
    after: "hover:bg-muted/50",
  },
  
  // Empty/placeholder states
  emptyState: {
    before: "text-gray-500 dark:text-gray-400",
    after: "text-muted-foreground",
  },
  
  // Dividers
  divider: {
    before: "border-gray-200 dark:border-gray-700",
    after: "border-border",
  },
} as const;

/**
 * Ring and focus state migrations
 */
export const focusMigrations = {
  "ring-gray-200": "ring-border",
  "ring-gray-300": "ring-ring",
  "focus:ring-gray-200": "focus:ring-ring",
  "focus-visible:ring-gray-300": "focus-visible:ring-ring",
} as const;

/**
 * Colors to KEEP as-is (intentional brand/status colors)
 * These should NOT be migrated to semantic tokens
 */
export const preserveColors = [
  // Division colors (brand-specific)
  "division-competitive", // amber/orange
  "division-intermediate", // blue
  "division-recreational", // green
  
  // Cornhole brand colors
  "cornhole-wood",
  "cornhole-green", 
  "cornhole-navy",
  "cornhole-cream",
  
  // Status colors (keep explicit for clarity)
  "text-green-*", // Success states
  "text-red-*", // Error states
  "text-amber-*", // Warning states
  "bg-green-*", // Success backgrounds
  "bg-red-*", // Error backgrounds
  "bg-amber-*", // Warning backgrounds
] as const;

/**
 * Quick reference: Most common replacements
 */
export const quickReference = {
  // Backgrounds
  "bg-white → bg-background": true,
  "bg-gray-50 → bg-muted": true,
  "bg-gray-800 → bg-card": true,
  
  // Text
  "text-gray-900 → text-foreground": true,
  "text-gray-500 → text-muted-foreground": true,
  
  // Borders
  "border-gray-200 → border-border": true,
  
  // Remove dark: variants when using semantic tokens
  "dark:bg-gray-800 → (remove, bg-card adapts)": true,
  "dark:text-white → (remove, text-foreground adapts)": true,
} as const;
