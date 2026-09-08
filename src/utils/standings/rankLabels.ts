import type { Ranking } from '@/types';

/**
 * How a rank cell reads. The division view shows the division rank with the
 * overall rank behind it; the all-teams view shows the overall rank alone.
 */
export const formatRankDisplay = (
  globalRank: number,
  divisionRank: number | null | undefined,
  showDivision: boolean
): string => {
  if (showDivision || !divisionRank) return `#${globalRank}`;
  return `#${divisionRank} (${globalRank})`;
};

/** The same cell spoken in full, including which way the team moved. */
export const getRankAriaLabel = (
  globalRank: number,
  divisionRank: number | null | undefined,
  showDivision: boolean,
  rankChange: Ranking['rankChange']
): string => {
  const base =
    showDivision || !divisionRank
      ? `Rank ${globalRank}`
      : `Division rank ${divisionRank}, overall rank ${globalRank}`;

  if (!rankChange) return base;

  const direction = rankChange > 0 ? 'up' : 'down';
  const amount = Math.abs(rankChange);
  return `${base}, moved ${direction} ${amount} position${amount > 1 ? 's' : ''}`;
};
