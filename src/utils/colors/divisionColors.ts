/**
 * Division color utilities for styling division-specific UI elements
 */

import { cn } from '@/lib/utils';

// Division gradients for cards and UI elements
export const getDivisionGradientClass = (division: string): string => {
  const divisionNameLower = division.toLowerCase();

  if (divisionNameLower.includes('competitive')) {
    return 'bg-gradient-to-br from-card via-[hsl(var(--competitive-soft)/0.06)] to-[hsl(var(--competitive-soft)/0.1)]';
  }

  if (divisionNameLower.includes('intermediate')) {
    return 'bg-gradient-to-br from-card via-[hsl(var(--intermediate-soft)/0.06)] to-[hsl(var(--intermediate-soft)/0.1)]';
  }

  if (divisionNameLower.includes('recreational')) {
    return 'bg-gradient-to-br from-card via-[hsl(var(--recreational-soft)/0.06)] to-[hsl(var(--recreational-soft)/0.1)]';
  }

  // Default gradient
  return 'bg-gradient-to-br from-card to-muted';
};

// Division header gradients
export const getDivisionHeaderClass = (division: string): string => {
  const divisionNameLower = division.toLowerCase();

  if (divisionNameLower.includes('competitive')) {
    return cn(
      'bg-gradient-to-br from-[hsl(var(--competitive-soft)/0.16)] to-[hsl(var(--competitive-soft)/0.04)]',
      'border-b-2 border-[hsl(var(--competitive-soft)/0.35)]'
    );
  }

  if (divisionNameLower.includes('intermediate')) {
    return cn(
      'bg-gradient-to-br from-[hsl(var(--intermediate-soft)/0.16)] to-[hsl(var(--intermediate-soft)/0.04)]',
      'border-b-2 border-[hsl(var(--intermediate-soft)/0.35)]'
    );
  }

  if (divisionNameLower.includes('recreational')) {
    return cn(
      'bg-gradient-to-br from-[hsl(var(--recreational-soft)/0.16)] to-[hsl(var(--recreational-soft)/0.04)]',
      'border-b-2 border-[hsl(var(--recreational-soft)/0.35)]'
    );
  }

  // Default header gradient
  return cn('bg-gradient-to-br from-muted to-card', 'border-b-2 border-border');
};

// Division text color classes
export const getDivisionTextClass = (division: string): string =>
  getDivisionSoftClasses(division).text;

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

const SOFT_CLASSES: Record<'competitive' | 'intermediate' | 'recreational', DivisionSoftClasses> =
  {
    competitive: {
      text: 'text-[hsl(var(--competitive-soft))]',
      border: 'border-[hsl(var(--competitive-soft)/0.35)]',
      borderLeft: 'border-l-[hsl(var(--competitive-soft)/0.55)]',
      borderTop: 'border-t-[hsl(var(--competitive-soft)/0.5)]',
      iconBg: 'bg-[hsl(var(--competitive-soft)/0.12)]',
      button:
        'bg-[hsl(var(--competitive-soft)/0.15)] hover:bg-[hsl(var(--competitive-soft)/0.25)] text-[hsl(var(--competitive-soft))] border border-[hsl(var(--competitive-soft)/0.35)]',
    },
    intermediate: {
      text: 'text-[hsl(var(--intermediate-soft))]',
      border: 'border-[hsl(var(--intermediate-soft)/0.35)]',
      borderLeft: 'border-l-[hsl(var(--intermediate-soft)/0.55)]',
      borderTop: 'border-t-[hsl(var(--intermediate-soft)/0.5)]',
      iconBg: 'bg-[hsl(var(--intermediate-soft)/0.12)]',
      button:
        'bg-[hsl(var(--intermediate-soft)/0.15)] hover:bg-[hsl(var(--intermediate-soft)/0.25)] text-[hsl(var(--intermediate-soft))] border border-[hsl(var(--intermediate-soft)/0.35)]',
    },
    recreational: {
      text: 'text-[hsl(var(--recreational-soft))]',
      border: 'border-[hsl(var(--recreational-soft)/0.35)]',
      borderLeft: 'border-l-[hsl(var(--recreational-soft)/0.55)]',
      borderTop: 'border-t-[hsl(var(--recreational-soft)/0.5)]',
      iconBg: 'bg-[hsl(var(--recreational-soft)/0.12)]',
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

  if (divisionNameLower.includes('competitive') || divisionNameLower.includes('hidden')) {
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }

  if (divisionNameLower.includes('intermediate')) {
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }

  if (divisionNameLower.includes('recreational')) {
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  }

  return 'bg-muted text-muted-foreground';
};
