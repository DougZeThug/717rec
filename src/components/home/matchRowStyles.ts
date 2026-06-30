import { format, isValid, parseISO } from 'date-fns';

// Conditional (winter vs default) class fragments for a match row. Selecting the
// whole object with a single ternary keeps MatchRow's branching low; the base
// classes stay inline in the JSX via cn().
export interface RowStyleFragments {
  iconColor: string;
  dateColor: string;
  bulletColor: string;
  glowBg: string;
  myLogoRing: string;
  teamNameColor: string;
  scoreNeutral: string;
  scoreDashColor: string;
  vsColor: string;
  opponentLogoRing: string;
  chevronColor: string;
}

export const DEFAULT_ROW_STYLES: RowStyleFragments = {
  iconColor: 'text-muted-foreground',
  dateColor: 'text-muted-foreground',
  bulletColor: 'text-muted-foreground/50',
  glowBg: 'bg-primary/20',
  myLogoRing: 'ring-2 ring-primary/20 group-hover:ring-primary/40',
  teamNameColor: 'text-foreground',
  scoreNeutral: 'text-foreground',
  scoreDashColor: 'text-muted-foreground',
  vsColor: 'text-muted-foreground',
  opponentLogoRing: 'ring-2 ring-muted/30 group-hover:ring-muted/50',
  chevronColor: 'text-muted-foreground/50 group-hover:text-primary',
};

export const WINTER_ROW_STYLES: RowStyleFragments = {
  iconColor: 'text-cyan-400/70',
  dateColor: 'text-cyan-200/70',
  bulletColor: 'text-cyan-300/30',
  glowBg: 'bg-cyan-400/20',
  myLogoRing: 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50',
  teamNameColor: 'text-cyan-100',
  scoreNeutral: 'text-cyan-200',
  scoreDashColor: 'text-cyan-300/50',
  vsColor: 'text-cyan-300/70',
  opponentLogoRing: 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50',
  chevronColor: 'text-cyan-400/50 group-hover:text-cyan-400',
};

// Color for one side's score: green if winning, red if losing, neutral if tied.
export const scoreColor = (self: number, other: number, neutral: string): string =>
  self > other ? 'text-green-500' : self < other ? 'text-red-500' : neutral;

// Human-readable date/time parts for a match, or sensible fallbacks.
export const matchDateParts = (dateStr: string | undefined) => {
  const matchDate = dateStr ? parseISO(dateStr) : null;
  const isValidDate = matchDate && isValid(matchDate);
  return {
    formattedDate: isValidDate ? format(matchDate, 'EEEE, MMM d') : 'Date TBD',
    formattedTime: isValidDate ? format(matchDate, 'h:mm a') : null,
  };
};
