/**
 * STRICT TYPE SCALE - Do not deviate!
 *
 * H1 (Page):     28px / 32px - Page titles only
 * H2 (Section):  20px / 28px - Section headers, card collection titles
 * H3 (Card):     16px / 22px - Card titles, item headers
 * Body:          14px / 20px - Standard text
 * Body Relaxed:  15px / 22px - Longer form text, descriptions
 * Caption:       12px / 16px - Labels, hints, timestamps
 *
 * NUMERIC TYPOGRAPHY:
 * Always use `tabular-nums` class on:
 * - Scores, rankings, percentages
 * - Record displays (W-L)
 * - Any numeric columns in tables
 */

export const typeScale = {
  // Page headings: 28px / 32px line-height
  h1: 'text-[28px] leading-[32px] font-bebas uppercase tracking-wide font-semibold',

  // Section headings: 20px / 28px line-height
  h2: 'text-[20px] leading-[28px] font-bebas uppercase tracking-wide font-medium',

  // Card titles: 16px / 22px line-height
  h3: 'text-[16px] leading-[22px] font-bebas uppercase tracking-wide font-medium',

  // Body: 14px / 20px (default)
  body: 'text-[14px] leading-[20px] font-inter',

  // Body relaxed: 15px / 22px (longer form text)
  bodyRelaxed: 'text-[15px] leading-[22px] font-inter',

  // Caption: 12px / 16px
  caption: 'text-[12px] leading-[16px] font-inter text-muted-foreground',

  // Numeric data (standings/scores) - prevents column wiggle
  numeric: 'font-inter tabular-nums',
  numericBold: 'font-inter font-bold tabular-nums',
  numericMedium: 'font-inter font-medium tabular-nums',
};

// Legacy heading styles (deprecated - use typeScale instead)
export const typography = {
  heading: {
    h1: typeScale.h1,
    h2: typeScale.h2,
    h3: typeScale.h3,
    h4: 'text-[14px] leading-[20px] font-bebas uppercase tracking-wide',
  },

  body: {
    large: typeScale.bodyRelaxed,
    default: typeScale.body,
    small: 'text-[13px] leading-[18px] font-inter',
    tiny: typeScale.caption,
  },

  special: {
    stat: 'font-bebas tracking-wide uppercase',
    accent: 'font-inter tracking-wide',
    numeric: typeScale.numeric,
  },
};
