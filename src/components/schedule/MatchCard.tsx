import { Pencil, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';

import { MatchInteractions } from '@/components/matches';
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { TeamLogo } from '@/components/ui/team';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import type { HeadToHeadData } from '@/hooks/useBatchHeadToHead';
import { useMatchPrediction } from '@/hooks/useMatchPrediction';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { Match } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

import MatchCountdown from './MatchCountdown';
import { MatchHeadToHead } from './MatchHeadToHead';
import { MatchPrediction } from './MatchPrediction';
import { UpsetTag } from './UpsetTag';

interface MatchCardProps {
  match: Match;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
  showInteractions?: boolean;
  prefetchedH2H?: HeadToHeadData | null;
  isBatchH2HLoading?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  isCompleted,
  onEdit,
  onDelete,
  showInteractions = true,
  prefetchedH2H,
  isBatchH2HLoading = false,
}) => {
  const { resolvedTheme } = useTheme();
  const { isAdminAccessGranted } = useAdminAccess();
  const isLight = resolvedTheme === 'light';
  const [scoreAnimation, setScoreAnimation] = useState(false);

  const team1Name = match.team1Details?.name || 'Unknown Team';
  const team2Name = match.team2Details?.name || 'Unknown Team';
  const team1Logo = match.team1Details?.image_url || '';
  const team2Logo = match.team2Details?.image_url || '';

  const { prediction, isUpsetResult } = useMatchPrediction({
    team1Details: match.team1Details,
    team2Details: match.team2Details,
    isCompleted,
    winnerId: match.winnerId,
  });

  const team1IsWinner =
    isCompleted &&
    match.team1_game_wins !== undefined &&
    match.team2_game_wins !== undefined &&
    (match.team1_game_wins || 0) > (match.team2_game_wins || 0);
  const team2IsWinner =
    isCompleted &&
    match.team1_game_wins !== undefined &&
    match.team2_game_wins !== undefined &&
    (match.team2_game_wins || 0) > (match.team1_game_wins || 0);

  const isPostponed = match.status === 'postponed';
  const isCanceled = match.status === 'canceled';
  const hasSpecialStatus = isPostponed || isCanceled;

  useEffect(() => {
    if (match.team1Score !== undefined || match.team2Score !== undefined) {
      setScoreAnimation(true);
      const timer = setTimeout(() => setScoreAnimation(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [match.team1Score, match.team2Score]);

  const getScoreStyle = useCallback(
    (isWinner: boolean) =>
      cn(
        'text-2xl font-black tracking-wide tabular-nums transition-all duration-500',
        scoreAnimation && 'animate-scale-in',
        isWinner
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted-foreground'
      ),
    [scoreAnimation]
  );

  const getTeamNameStyle = useCallback(
    (isWinner: boolean) =>
      cn(
        'text-xs font-medium truncate max-w-[120px] text-center',
        isWinner
          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
          : 'text-foreground'
      ),
    []
  );

  const shouldShowInteractions = showInteractions && isCompleted;

  return (
    <div className={cn('relative', animations.scaleIn)}>
      {/* Gradient border wrapper */}
      <div
        className={cn(
          'rounded-xl p-[1.5px]',
          isCompleted
            ? 'bg-gradient-to-br from-emerald-500/40 via-transparent to-emerald-500/20'
            : 'bg-gradient-to-br from-primary/30 via-transparent to-accent/20'
        )}
      >
        <div
          className={cn(
            'rounded-xl overflow-hidden',
            isLight ? 'bg-card' : 'bg-card'
          )}
        >
          {/* Status badge - centered top */}
          {(isCompleted || hasSpecialStatus) && (
            <div className="flex items-center justify-center gap-2 pt-1.5">
              {isCompleted && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary rounded-full">
                  Final
                </span>
              )}
              {isUpsetResult && <UpsetTag />}
              {hasSpecialStatus && (
                <span
                  className={cn(
                    'px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full',
                    isPostponed
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : 'bg-destructive/10 text-destructive'
                  )}
                >
                  {isPostponed ? 'Postponed' : 'Canceled'}
                </span>
              )}
            </div>
          )}

          <div className="px-3 py-2">
            {/* Centered layout: Logo - Score - Logo */}
            <div className="flex items-center justify-center gap-2">
              {/* Team 1 */}
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <TransitionLink
                  to={`/teams/${toTeamSlug(team1Name)}`}
                  className="hover:opacity-80 transition-opacity"
                >
                  <TeamLogo
                    imageUrl={team1Logo}
                    teamName={team1Name}
                    teamId={match.team1Id}
                    size="md"
                  />
                </TransitionLink>
                <TransitionLink
                  to={`/teams/${toTeamSlug(team1Name)}`}
                  className="flex flex-col items-center gap-0.5 min-w-0"
                >
                  <span className={getTeamNameStyle(team1IsWinner)}>
                    {team1Name}
                  </span>
                </TransitionLink>
              </div>

              {/* Score pill */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-1.5 rounded-full',
                    'bg-muted/80 dark:bg-muted/40',
                    'shadow-sm'
                  )}
                >
                  <span className={getScoreStyle(team1IsWinner)}>
                    {isCompleted ? (match.team1_game_wins || 0) : (match.team1Score || 0)}
                  </span>
                  <span className="text-lg font-bold text-muted-foreground/60">–</span>
                  <span className={getScoreStyle(team2IsWinner)}>
                    {isCompleted ? (match.team2_game_wins || 0) : (match.team2Score || 0)}
                  </span>
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <TransitionLink
                  to={`/teams/${toTeamSlug(team2Name)}`}
                  className="hover:opacity-80 transition-opacity"
                >
                  <TeamLogo
                    imageUrl={team2Logo}
                    teamName={team2Name}
                    teamId={match.team2Id}
                    size="md"
                  />
                </TransitionLink>
                <TransitionLink
                  to={`/teams/${toTeamSlug(team2Name)}`}
                  className="flex flex-col items-center gap-0.5 min-w-0"
                >
                  {team2IsWinner && <Check className="h-3 w-3 text-emerald-500" />}
                  <span className={getTeamNameStyle(team2IsWinner)}>
                    {team2Name}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    ({match.team2_game_wins || 0})
                  </span>
                </TransitionLink>
              </div>
            </div>

            {/* H2H Record */}
            <div className="mt-1.5">
              <MatchHeadToHead
                team1Id={match.team1Id}
                team2Id={match.team2Id}
                team1Name={team1Name}
                team2Name={team2Name}
                prefetchedData={prefetchedH2H}
                isBatchLoading={isBatchH2HLoading}
              />
            </div>

            {/* Countdown for upcoming */}
            {!isCompleted && match.date && (
              <div className="mt-1.5">
                <MatchCountdown matchDate={match.date} />
              </div>
            )}

            {/* Prediction bar for upcoming */}
            {!isCompleted && prediction && (
              <div className="mt-1.5">
                <MatchPrediction
                  prediction={prediction}
                  team1Name={team1Name}
                  team2Name={team2Name}
                />
              </div>
            )}

            {/* Admin actions */}
            {((onEdit && !isCompleted) || (onDelete && (!isCompleted || isAdminAccessGranted))) &&
              isAdminAccessGranted && (
                <div className="flex justify-end gap-2 pt-2">
                  {onEdit && !isCompleted && (
                    <button
                      onClick={() => onEdit(match)}
                      className="p-1.5 rounded-full transition-all duration-200 bg-muted hover:bg-muted/80 active:scale-95"
                      aria-label="Edit match"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(match.id)}
                      className={cn(
                        'p-1.5 rounded-full transition-all duration-200 active:scale-95',
                        isCompleted
                          ? 'bg-destructive/10 hover:bg-destructive/20'
                          : 'bg-muted hover:bg-destructive/10'
                      )}
                      aria-label={isCompleted ? 'Permanently delete completed match' : 'Delete match'}
                    >
                      <Trash2
                        className={cn(
                          'h-3.5 w-3.5',
                          isCompleted ? 'text-destructive' : 'text-muted-foreground'
                        )}
                      />
                    </button>
                  )}
                </div>
              )}

            {/* Interactions */}
            {shouldShowInteractions && <MatchInteractions matchId={match.id} className="mt-2" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MatchCard);
