/**
 * Division color utilities for styling division-specific UI elements
 */

// Division badge color classes (for small badges/chips)
/**
 * Softer, theme-friendly division styling.
 * Same hue identity as the standard tier colors, but desaturated so large
 * surfaces (playoff cards) do not fight the app theme.
 */
export interface DivisionSoftClasses {
  text: string;
  border: string;
  borderLeft: string;
  borderTop: string;
  iconBg: string;
  button: string;
  /** Tinted surface only, no text/border. */
  softBg: string;
  /** Small badge/chip: tinted fill + tier text + hairline border. */
  badge: string;
}

const SOFT_CLASSES: Record<'competitive' | 'intermediate' | 'recreational', DivisionSoftClasses> = {
  competitive: {
    text: 'text-[hsl(var(--competitive-soft))]',
    border: 'border-[hsl(var(--competitive-soft)/0.35)]',
    borderLeft: 'border-l-[hsl(var(--competitive-soft)/0.55)]',
    borderTop: 'border-t-[hsl(var(--competitive-soft)/0.5)]',
    iconBg: 'bg-[hsl(var(--competitive-soft)/0.12)]',
    softBg: 'bg-[hsl(var(--competitive-soft)/0.12)]',
    badge:
      'bg-[hsl(var(--competitive-soft)/0.15)] text-[hsl(var(--competitive-soft))] border border-[hsl(var(--competitive-soft)/0.3)]',
    button:
      'bg-[hsl(var(--competitive-soft)/0.15)] hover:bg-[hsl(var(--competitive-soft)/0.25)] text-[hsl(var(--competitive-soft))] border border-[hsl(var(--competitive-soft)/0.35)]',
  },
  intermediate: {
    text: 'text-[hsl(var(--intermediate-soft))]',
    border: 'border-[hsl(var(--intermediate-soft)/0.35)]',
    borderLeft: 'border-l-[hsl(var(--intermediate-soft)/0.55)]',
    borderTop: 'border-t-[hsl(var(--intermediate-soft)/0.5)]',
    iconBg: 'bg-[hsl(var(--intermediate-soft)/0.12)]',
    softBg: 'bg-[hsl(var(--intermediate-soft)/0.12)]',
    badge:
      'bg-[hsl(var(--intermediate-soft)/0.15)] text-[hsl(var(--intermediate-soft))] border border-[hsl(var(--intermediate-soft)/0.3)]',
    button:
      'bg-[hsl(var(--intermediate-soft)/0.15)] hover:bg-[hsl(var(--intermediate-soft)/0.25)] text-[hsl(var(--intermediate-soft))] border border-[hsl(var(--intermediate-soft)/0.35)]',
  },
  recreational: {
    text: 'text-[hsl(var(--recreational-soft))]',
    border: 'border-[hsl(var(--recreational-soft)/0.35)]',
    borderLeft: 'border-l-[hsl(var(--recreational-soft)/0.55)]',
    borderTop: 'border-t-[hsl(var(--recreational-soft)/0.5)]',
    iconBg: 'bg-[hsl(var(--recreational-soft)/0.12)]',
    softBg: 'bg-[hsl(var(--recreational-soft)/0.12)]',
    badge:
      'bg-[hsl(var(--recreational-soft)/0.15)] text-[hsl(var(--recreational-soft))] border border-[hsl(var(--recreational-soft)/0.3)]',
    button:
      'bg-[hsl(var(--recreational-soft)/0.15)] hover:bg-[hsl(var(--recreational-soft)/0.25)] text-[hsl(var(--recreational-soft))] border border-[hsl(var(--recreational-soft)/0.35)]',
  },
};

const NEUTRAL_SOFT: DivisionSoftClasses = {
  text: 'text-muted-foreground',
  border: 'border-border',
  borderLeft: 'border-l-muted-foreground/50',
  borderTop: 'border-t-muted-foreground/50',
  iconBg: 'bg-muted',
  softBg: 'bg-muted',
  badge: 'bg-muted text-muted-foreground border border-border',
  button: 'bg-muted hover:bg-muted/80 text-foreground border border-border',
};

export const getDivisionSoftClasses = (
  division: string | null | undefined
): DivisionSoftClasses => {
  const d = (division ?? '').toLowerCase();
  if (d.includes('competitive')) return SOFT_CLASSES.competitive;
  if (d.includes('intermediate')) return SOFT_CLASSES.intermediate;
  if (d.includes('recreational')) return SOFT_CLASSES.recreational;
  return NEUTRAL_SOFT;
};

export const getDivisionBadgeColor = (division: string): string => {
  const divisionNameLower = division.toLowerCase();

  // "Hidden" divisions keep the competitive identity.
  if (divisionNameLower.includes('hidden')) return SOFT_CLASSES.competitive.badge;

  return getDivisionSoftClasses(division).badge;
};
