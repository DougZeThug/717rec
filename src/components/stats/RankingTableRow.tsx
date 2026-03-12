import { Scale } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Button } from '@/components/ui/button';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { formatPowerScore, getPowerScoreColor, getSosColor } from '@/utils/colors';
import { toTeamSlug } from '@/utils/teamSlug';

import RankTrendIndicator from './RankTrendIndicator';

interface RankingTableRowProps {
  ranking: Ranking;
  index: number;
  showRankChange?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showDivision?: boolean;
  rowIndex?: number;
}

const RankingTableRow: React.FC<RankingTableRowProps> = ({
  ranking,
  index,
  showRankChange = true,
  isExpanded = false,
  onToggleExpand,
  showDivision = false,
  rowIndex: _rowIndex,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;

  // Text color based on theme
  const textColor = isWinterTheme ? 'text-card-foreground' : 'text-slate-900 dark:text-white';

  // Format rank display based on view mode
  const formatRankDisplay = () => {
    if (showDivision) {
      // Unified view: show only global rank
      return `#${globalRank}`;
    } else {
      // Division view: show division rank with global rank in parentheses
      if (divisionRank) {
        return `#${divisionRank} (${globalRank})`;
      }
      return `#${globalRank}`;
    }
  };

  // Generate accessible rank description for screen readers
  const getRankAriaLabel = () => {
    let label = showDivision
      ? `Rank ${globalRank}`
      : divisionRank
        ? `Division rank ${divisionRank}, overall rank ${globalRank}`
        : `Rank ${globalRank}`;

    if (ranking.rankChange && ranking.rankChange !== 0) {
      const direction = ranking.rankChange > 0 ? 'up' : 'down';
      const amount = Math.abs(ranking.rankChange);
      label += `, moved ${direction} ${amount} position${amount > 1 ? 's' : ''}`;
    }

    return label;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onToggleExpand && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onToggleExpand();
    }
  };

  return (
    <tr
      className={cn(
        'border-b transition-colors group',
        isWinterTheme
          ? 'border-frost-border/20 even:bg-white/5 hover:bg-white/10'
          : 'border-gray-100 dark:border-slate-700 even:bg-gray-50 dark:even:bg-white/5 hover:bg-gray-50 dark:hover:bg-slate-700/50',
        isExpanded && (isWinterTheme ? 'bg-frost-primary/20' : 'bg-blue-50 dark:bg-blue-900/20'),
        onToggleExpand && 'focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-2'
      )}
      onClick={onToggleExpand}
      onKeyDown={handleKeyDown}
      role={onToggleExpand ? 'button' : undefined}
      tabIndex={onToggleExpand ? 0 : undefined}
      style={{ cursor: onToggleExpand ? 'pointer' : 'default' }}
    >
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span
            className={cn('font-medium min-w-[3rem] whitespace-nowrap', textColor)}
            aria-label={getRankAriaLabel()}
          >
            {formatRankDisplay()}
          </span>
          {showRankChange && <RankTrendIndicator rankChange={ranking.rankChange} />}
        </div>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/teams/${toTeamSlug(ranking.teamName)}`}
            state={{ from: '/stats', scrollPosition: window.scrollY }}
            aria-label={`View ${ranking.teamName} team details`}
            className={cn(
              'flex items-center gap-3 transition-colors group flex-1 min-w-0',
              isWinterTheme
                ? 'hover:text-frost-primary'
                : 'hover:text-blue-600 dark:hover:text-blue-400'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <TeamLogo
              imageUrl={ranking.imageUrl || ranking.logoUrl}
              teamName={ranking.teamName}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  'font-medium truncate',
                  textColor,
                  isWinterTheme
                    ? 'group-hover:text-frost-primary'
                    : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                )}
              >
                {ranking.teamName}
              </span>
              <TeamBadgeCollection
                teamId={ranking.teamId}
                size="sm"
                maxDisplay={4}
                className="mt-1"
              />
            </div>
          </Link>
          <Link
            to={`/compare?team1=${ranking.teamId}`}
            aria-label={`Compare ${ranking.teamName} with another team`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
                isWinterTheme ? 'hover:bg-frost-primary/10' : ''
              )}
            >
              <Scale className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </td>
      {showDivision && (
        <td className={cn('py-3 px-3 text-center', textColor)}>{ranking.divisionName || 'N/A'}</td>
      )}
      <td className="py-3 px-3 text-center">
        <span className={cn('font-medium tabular-nums', getPowerScoreColor(ranking.powerScore))}>
          {formatPowerScore(ranking.powerScore)}
        </span>
      </td>
      <td className={cn('py-3 px-3 text-center font-medium tabular-nums', textColor)}>
        {ranking.wins}-{ranking.losses}
      </td>
      <td className="py-3 px-3 text-center">
        <span
          className={cn(
            'font-medium tabular-nums',
            winPercentage >= 75
              ? 'text-green-600 dark:text-green-500'
              : winPercentage >= 60
                ? 'text-blue-600 dark:text-blue-500'
                : winPercentage >= 40
                  ? 'text-orange-500 dark:text-orange-400'
                  : 'text-red-600 dark:text-red-500'
          )}
        >
          {winPercentage.toFixed(1)}%
        </span>
      </td>
      <td
        className={cn(
          'py-3 px-3 text-center font-medium tabular-nums hidden md:table-cell',
          textColor
        )}
      >
        {ranking.gamesWon || 0}-{ranking.gamesLost || 0}
      </td>
      <td className="py-3 px-3 text-center hidden lg:table-cell">
        <span
          className={cn(
            'font-medium tabular-nums',
            gameWinPercentage >= 75
              ? 'text-green-600 dark:text-green-500'
              : gameWinPercentage >= 60
                ? 'text-blue-600 dark:text-blue-500'
                : gameWinPercentage >= 40
                  ? 'text-orange-500 dark:text-orange-400'
                  : 'text-red-600 dark:text-red-500'
          )}
        >
          {gameWinPercentage.toFixed(1)}%
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={cn('font-medium tabular-nums', getSosColor(ranking.sos || 0))}>
          {(ranking.sos || 0).toFixed(3)}
        </span>
      </td>
      <td className={cn('py-3 px-3 text-center font-medium tabular-nums', textColor)}>
        {ranking.streak || 'N/A'}
      </td>
      <td className="py-3 px-3 text-center">
        {showRankChange && ranking.rankChange !== undefined && ranking.rankChange !== 0 && (
          <RankTrendIndicator rankChange={ranking.rankChange} />
        )}
      </td>
    </tr>
  );
};

export default RankingTableRow;
