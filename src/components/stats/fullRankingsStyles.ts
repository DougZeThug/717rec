import { gradients } from '@/styles/design-system';

interface StandingsTheme {
  isWinterTheme: boolean;
  isLight: boolean;
}

/**
 * The three-way theme choices the standings card makes — winter, light, dark.
 * They were nested ternaries inside five `cn()` calls in the component, which
 * is most of what made its control flow hard to follow.
 */
export const standingsCardClasses = ({ isWinterTheme, isLight }: StandingsTheme): string[] => [
  isWinterTheme
    ? 'winter-card-surface border-frost-primary/50'
    : 'border-blue-300 dark:border-blue-700/80',
  !isWinterTheme && isLight ? gradients.card.blueOrange : '',
];

export const standingsHeaderClasses = ({ isWinterTheme, isLight }: StandingsTheme): string => {
  if (isWinterTheme) return 'bg-frost-primary/5 border-b border-frost-border/30';
  if (isLight)
    return 'bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 border-b border-blue-100';
  return 'bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/80 border-b border-blue-900/30';
};

export const standingsTitleClasses = ({ isWinterTheme }: StandingsTheme): string =>
  isWinterTheme
    ? 'text-[hsl(var(--foreground))]'
    : 'bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400';

/**
 * The description under the standings title.
 *
 * Light and dark used to be written out by hand — a forced `#444444` and
 * `text-gray-400`. Both are what `--muted-foreground` already resolves to in
 * their own theme, so neither arm is needed: `CardDescription` carries
 * `text-muted-foreground` and it is correct in every theme.
 */
export const standingsDescriptionClasses = ({ isWinterTheme }: StandingsTheme): string =>
  isWinterTheme ? 'text-[hsl(var(--muted-foreground))]' : '';

export const standingsContentClasses = ({ isWinterTheme }: StandingsTheme): string =>
  isWinterTheme ? 'bg-transparent' : 'bg-gradient-to-br from-muted to-card';
