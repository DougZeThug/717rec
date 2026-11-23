/**
 * STRICT TYPE SCALE - Do not deviate!
 *
 * H1 (Page):     28px / 32px - Page titles only
 * H2 (Section):  20px / 28px - Section headers, card collection titles
 * Body:          14px / 20px - Standard text
 * Caption:       12px / 16px - Labels, hints, timestamps
 *
 * NUMERIC TYPOGRAPHY:
 * Always use 'tabular-nums' class on:
 * - Scores, rankings, percentages
 * - Record displays (W-L)
 * - Any numeric columns in tables
 */

export const typeScale = {
  // Page headings: 28px / 32px line-height
  // Bebas Neue ships one weight (400). Asking for semibold makes the browser fake a bold.
  h1: 'text-[28px] leading-[32px] font-bebas uppercase tracking-wide',

  // Section headings: 20px / 28px line-height
  h2: 'text-[20px] leading-[28px] font-bebas uppercase tracking-wide',

  // Body: 14px / 20px (default)
  body: 'text-sm font-inter',

  // Caption: 12px / 16px
  caption: 'text-[12px] leading-[16px] font-inter text-muted-foreground',
};
