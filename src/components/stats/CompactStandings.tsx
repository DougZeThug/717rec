import { useTheme } from 'next-themes';
import React, { CSSProperties, useCallback } from 'react';
import { useNavigate } from 'react-router';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useIsMobile } from '@/hooks/useMobile';
import { useVirtualization } from '@/hooks/useVirtualization';
import { cn } from '@/lib/utils';
import { getRowInteractionStyles } from '@/styles/interactionUtils';
import { Ranking } from '@/types';
import { formatPowerScore, getPowerScoreColor, getSosColor } from '@/utils/colors';
import { toTeamSlug } from '@/utils/teamSlug';

interface CompactStandingsProps {
  rankings: Ranking[];
}

// Fixed row height (px) for the virtualized mobile list, including the gap
// between cards. Generous enough to avoid clipping the tallest card (logo row).
const MOBILE_ROW_HEIGHT = 84;

// Rank medal/striping styles. Module-level pure helper so the extracted row
// component can reuse it without prop-drilling a callback.
const getRankStyles = (index: number, isLight: boolean): string => {
  if (isLight) {
    if (index === 0)
      return 'bg-gradient-to-r from-amber-100 to-amber-200/80 !font-bold text-gray-900 shadow-sm';
    if (index === 1)
      return 'bg-gradient-to-r from-slate-100 to-blue-100/70 !font-bold text-gray-900 shadow-sm';
    if (index === 2)
      return 'bg-gradient-to-r from-orange-100/90 to-orange-200/70 !font-bold text-gray-900 shadow-sm';
    return 'bg-gray-50 text-gray-900';
  }
  if (index === 0) return 'bg-gradient-to-r from-amber-900/30 to-amber-800/20 font-bold text-white';
  if (index === 1) return 'bg-gradient-to-r from-slate-800/30 to-blue-900/20 font-bold text-white';
  if (index === 2)
    return 'bg-gradient-to-r from-orange-900/30 to-orange-800/20 font-bold text-white';
  return 'bg-gray-800/30 text-white';
};

// Rank medal badge shown at the start of each mobile card.
const RankBadge: React.FC<{ index: number; isLight: boolean }> = ({ index, isLight }) => (
  <div
    className={cn(
      'size-7 flex items-center justify-center rounded-full font-mono flex-shrink-0 shadow-inner',
      getRankStyles(index, isLight)
    )}
  >
    {index + 1}
  </div>
);

// Team logo + (truncated) name for a mobile card.
const TeamIdentity: React.FC<{ team: Ranking }> = ({ team }) => (
  <div className="flex min-w-0 items-center space-x-2">
    {team.imageUrl && (
      <div className="size-8 flex items-center justify-center bg-muted rounded-md overflow-hidden border border-border flex-shrink-0">
        <img
          src={team.imageUrl}
          alt={team.teamName}
          className="size-8 rounded-none object-contain"
        />
      </div>
    )}
    <span className="font-bebas tracking-wide uppercase text-base text-foreground truncate">
      {team.teamName}
    </span>
  </div>
);

// Record / win% / power / SOS stat line for a mobile card.
const MobileStandingStats: React.FC<{ team: Ranking }> = ({ team }) => {
  const hasGames = team.wins + team.losses > 0;
  return (
    <div className="flex items-center space-x-4 text-sm font-mono mt-0.5">
      <span className="text-foreground">
        {team.wins}-{team.losses}
      </span>
      <span className="text-foreground">
        {hasGames ? `${(team.winPercentage * 100).toFixed(1)}%` : '—'}
      </span>
      <span
        className={cn(
          getPowerScoreColor(team.powerScore),
          'bg-gradient-to-r from-transparent to-blue-50/50 dark:to-blue-900/10 px-1 rounded'
        )}
      >
        {formatPowerScore(team.powerScore)}
      </span>
      <span
        className={cn(
          hasGames ? getSosColor(team.sos) : 'text-muted-foreground',
          'bg-gradient-to-r from-transparent to-orange-50/50 dark:to-orange-900/10 px-1 rounded'
        )}
      >
        {hasGames ? team.sos.toFixed(3) : '—'}
      </span>
    </div>
  );
};

// Mobile standings card. Memoized: rendered once per team in a growable list.
const MobileStandingRow: React.FC<{
  team: Ranking;
  index: number;
  isLight: boolean;
  onTeamClick: (teamName: string) => void;
}> = React.memo(({ team, index, isLight, onTeamClick }) => (
  <button
    type="button"
    onClick={() => onTeamClick(team.teamName)}
    className={cn(
      'w-full text-left',
      getRowInteractionStyles(
        'flex items-center justify-between p-2 rounded-lg border cursor-pointer bg-card border-border'
      ),
      index < 3 ? 'shadow-sm' : '',
      index === 0 ? 'border-amber-200 dark:border-amber-800/40' : '',
      index === 1 ? 'border-blue-200 dark:border-blue-800/40' : '',
      index === 2 ? 'border-orange-200 dark:border-orange-800/40' : ''
    )}
  >
    <div className="flex min-w-0 items-center space-x-2">
      <RankBadge index={index} isLight={isLight} />
      <div className="flex min-w-0 flex-col">
        <TeamIdentity team={team} />
        <MobileStandingStats team={team} />
      </div>
    </div>
  </button>
));
MobileStandingRow.displayName = 'MobileStandingRow';

const CompactStandings: React.FC<CompactStandingsProps> = ({ rankings }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { shouldVirtualize } = useVirtualization({ itemCount: rankings.length, threshold: 30 });

  const handleTeamClick = useCallback(
    (teamName: string) => {
      navigate(`/teams/${toTeamSlug(teamName)}`, {
        state: { from: '/stats', scrollPosition: window.scrollY },
      });
    },
    [navigate]
  );

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, teamName: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTeamClick(teamName);
      }
    },
    [handleTeamClick]
  );

  const renderMobileRow = useCallback(
    (team: Ranking, index: number, style: CSSProperties) => (
      <div key={team.teamId} style={style} className="pb-2">
        <MobileStandingRow
          team={team}
          index={index}
          isLight={isLight}
          onTeamClick={handleTeamClick}
        />
      </div>
    ),
    [isLight, handleTeamClick]
  );

  if (isMobile) {
    // Only long lists (whole-league standings) pay the virtualization cost;
    // short per-division lists render normally to keep page-level scrolling.
    if (shouldVirtualize) {
      return (
        <VirtualizedList
          items={rankings}
          rowHeight={MOBILE_ROW_HEIGHT}
          height={Math.min(rankings.length * MOBILE_ROW_HEIGHT, 600)}
          renderRow={renderMobileRow}
          overscanCount={4}
        />
      );
    }

    return (
      <div className="space-y-2">
        {rankings.map((team, index) => (
          <MobileStandingRow
            key={team.teamId}
            team={team}
            index={index}
            isLight={isLight}
            onTeamClick={handleTeamClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table
        className={cn(
          'bg-card border border-border rounded-xl shadow-sm',
          'border-t-2 border-t-blue-300 dark:border-t-blue-700/70'
        )}
      >
        <TableHeader>
          <TableRow
            className={cn(
              isLight
                ? 'bg-gradient-to-r from-blue-50/80 to-blue-100/50'
                : 'bg-gradient-to-r from-gray-800/90 to-gray-800/60',
              'border-b border-blue-200/70 dark:border-blue-900/30'
            )}
          >
            <TableHead className="w-10 font-mono tracking-wide text-muted-foreground">
              Rank
            </TableHead>
            <TableHead className="font-semibold uppercase tracking-wide font-bebas text-muted-foreground">
              Team
            </TableHead>
            <TableHead className="text-center font-mono text-muted-foreground">Record</TableHead>
            <TableHead className="text-center font-mono text-muted-foreground">Win %</TableHead>
            <TableHead className="text-center font-mono text-muted-foreground">
              Power Score
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((team, index) => (
            <TableRow
              key={team.teamId}
              role="button"
              tabIndex={0}
              aria-label={`View ${team.teamName} team details`}
              className={cn(
                getRowInteractionStyles('cursor-pointer font-inter'),
                isLight && index % 2 === 0 ? 'bg-white' : '',
                isLight && index % 2 === 1 ? 'bg-blue-50/30' : '',
                !isLight && index % 2 === 0 ? 'bg-gray-800/70' : '',
                !isLight && index % 2 === 1 ? 'bg-gray-800/40' : '',
                index === 0 ? 'border-l-4 border-amber-400 dark:border-amber-600' : '',
                index === 1 ? 'border-l-4 border-blue-400 dark:border-blue-600' : '',
                index === 2 ? 'border-l-4 border-orange-400 dark:border-orange-600' : '',
                'hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-orange-50/20 dark:hover:from-blue-900/10 dark:hover:to-orange-900/5',
                'focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-2'
              )}
              onClick={() => handleTeamClick(team.teamName)}
              onKeyDown={(e) => handleRowKeyDown(e, team.teamName)}
            >
              <TableCell className={cn(getRankStyles(index, isLight), 'font-mono text-lg')}>
                <div className="size-8 flex items-center justify-center rounded-full">
                  {index + 1}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3 min-w-0">
                  {team.imageUrl && (
                    <div className="size-8 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                      <img
                        src={team.imageUrl}
                        alt={team.teamName}
                        className="size-full object-contain"
                      />
                    </div>
                  )}
                  <span
                    className={cn(
                      'font-bebas tracking-wide uppercase text-base text-foreground truncate',
                      index < 3 && 'text-lg'
                    )}
                  >
                    {team.teamName}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center font-mono text-foreground">
                <span>
                  {team.wins}-{team.losses}
                </span>
              </TableCell>
              <TableCell className="text-center font-mono text-foreground">
                <span>
                  {team.wins + team.losses > 0 ? `${(team.winPercentage * 100).toFixed(1)}%` : '—'}
                </span>
              </TableCell>
              <TableCell
                className={cn(
                  'text-center font-semibold font-mono',
                  getPowerScoreColor(team.powerScore),
                  index < 3
                    ? 'bg-gradient-to-r from-transparent to-blue-50/50 dark:to-blue-900/10 rounded'
                    : ''
                )}
              >
                {formatPowerScore(team.powerScore)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CompactStandings;
