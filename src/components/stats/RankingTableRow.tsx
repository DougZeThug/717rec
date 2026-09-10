import React from 'react';

import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { formatRankDisplay, getRankAriaLabel } from '@/utils/standings/rankLabels';

import { RankingStatCells } from './RankingStatCells';
import { RankingTeamCell } from './RankingTeamCell';
import RankTrendIndicator from './RankTrendIndicator';

interface RankingTableRowProps {
  ranking: Ranking;
  index: number;
  showRankChange?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showDivision?: boolean;
  rowIndex?: number;
  prefetchedBadges?: import('@/types/badges').TeamBadgeEvent[];
}

const RankingTableRow: React.FC<RankingTableRowProps> = ({
  ranking,
  index,
  showRankChange = true,
  isExpanded = false,
  onToggleExpand,
  showDivision = false,
  rowIndex: _rowIndex,
  prefetchedBadges,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  // Text color based on theme
  const textColor = isWinterTheme ? 'text-card-foreground' : 'text-foreground';

  // NOTE: the row is intentionally NOT a focusable `role="button"`. It contains
  // interactive links (team details, compare), and nesting focusable controls
  // inside a focusable button violates WCAG 4.1.2 (axe `no-focusable-content`).
  // Row-level expand toggles only a background highlight, so we keep it as a
  // mouse-only affordance while leaving the inner links keyboard-accessible.
  return (
    <tr
      className={cn(
        'border-b transition-colors group',
        isWinterTheme
          ? 'border-frost-border/20 even:bg-white/5 hover:bg-white/10'
          : 'border-border even:bg-muted/50 hover:bg-accent',
        isExpanded && (isWinterTheme ? 'bg-frost-primary/20' : 'bg-blue-50 dark:bg-blue-900/20')
      )}
      onClick={onToggleExpand}
      style={{ cursor: onToggleExpand ? 'pointer' : 'default' }}
    >
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span
            className={cn('font-medium min-w-[3rem] whitespace-nowrap', textColor)}
            aria-label={getRankAriaLabel(
              globalRank,
              divisionRank,
              showDivision,
              ranking.rankChange
            )}
          >
            {formatRankDisplay(globalRank, divisionRank, showDivision)}
          </span>
          {showRankChange && <RankTrendIndicator rankChange={ranking.rankChange} />}
        </div>
      </td>
      <td className="py-3 px-3">
        <RankingTeamCell
          teamId={ranking.teamId}
          teamName={ranking.teamName}
          imageUrl={ranking.imageUrl}
          logoUrl={ranking.logoUrl}
          textColor={textColor}
          prefetchedBadges={prefetchedBadges}
        />
      </td>
      <RankingStatCells
        ranking={ranking}
        textColor={textColor}
        showDivision={showDivision}
        showRankChange={showRankChange}
      />
    </tr>
  );
};

export default RankingTableRow;
