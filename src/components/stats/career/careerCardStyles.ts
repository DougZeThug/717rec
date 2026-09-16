import { gradients } from '@/styles/design-system';

export interface CareerCardTheme {
  isWinterTheme: boolean;
  isLight: boolean;
}

/**
 * The theme and size choices the two career cards make.
 *
 * These were nested ternaries inside `cn()` calls, which is most of what made
 * their control flow hard to follow — the same split as `fullRankingsStyles.ts`
 * one directory up. They started as private helpers in
 * `AllTeamsCareerPowerScoreChart`, and moved here when the rankings card turned
 * out to make byte-identical choices; a second private copy would have been two
 * places to keep in step.
 *
 * Note `isLight` already excludes winter at both call sites
 * (`!isWinterTheme && resolvedTheme === 'light'`), so nothing here needs to
 * guard against the two being true together.
 */
export const careerCardClasses = ({ isWinterTheme, isLight }: CareerCardTheme): string[] => [
  isWinterTheme
    ? 'border-frost-border/50 bg-[hsl(var(--card))]'
    : 'border-blue-300 dark:border-blue-700/80',
  isLight ? gradients.card.blueOrange : '',
];

export const careerHeaderClasses = ({ isWinterTheme, isLight }: CareerCardTheme): string[] => {
  if (isWinterTheme) {
    return ['bg-[hsl(var(--card))]', 'border-b border-frost-border/30'];
  }
  return [
    isLight
      ? 'bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30'
      : 'bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/80',
    'border-b border-blue-100 dark:border-blue-900/30',
  ];
};

/** Header padding: tighter on a phone. */
export const careerHeaderPadding = (isMobile: boolean): string =>
  isMobile ? 'py-2.5 px-3' : 'py-4';

/** The card heading, which carries its own gradient in every theme. */
export const careerTitleClasses = (isMobile: boolean): string[] => [
  'font-bebas uppercase tracking-wide',
  isMobile ? 'text-lg' : 'text-xl sm:text-2xl',
  'bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400',
  'heading-winter',
];

/** The rankings card's body, which sits under a different surface in winter. */
export const careerContentClasses = ({ isWinterTheme }: CareerCardTheme): string =>
  isWinterTheme ? 'bg-[hsl(var(--card))]' : 'bg-gradient-to-br from-muted to-card';

/** The Export button, which borrows the card's border colour. */
export const careerExportButtonClasses = ({ isWinterTheme }: CareerCardTheme): string =>
  isWinterTheme
    ? 'border-frost-border/50 hover:bg-frost-primary/10'
    : 'border-muted-foreground/30 hover:bg-muted';
