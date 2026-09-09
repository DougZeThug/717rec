import React from 'react';

import { MatchInteractions } from '@/components/matches';
import { useCanScoreMatch } from '@/hooks/live-scoring/useCanScoreMatch';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import type { HeadToHeadData } from '@/hooks/useBatchHeadToHead';
import { useMatchPrediction } from '@/hooks/useMatchPrediction';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { Match } from '@/types';
import { deriveMatchStatus } from '@/utils/matchStatus';

import { MatchCardAdminActions } from './match-card/MatchCardAdminActions';
import { MatchCardCtas } from './match-card/MatchCardCtas';
import { MatchCardStatusBadge } from './match-card/MatchCardStatusBadge';
import { MatchCardTeamsRow } from './match-card/MatchCardTeamsRow';
import { MatchCardUpcomingExtras } from './match-card/MatchCardUpcomingExtras';
import { useScoreAnimation } from './match-card/useScoreAnimation';
import { MatchHeadToHead } from './MatchHeadToHead';

interface MatchCardProps {
  match: Match;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
  showInteractions?: boolean;
  prefetchedH2H?: HeadToHeadData | null;
  isBatchH2HLoading?: boolean;
  /**
   * Set of match IDs known to have live-scoring data. When provided, the
   * "View match recap" CTA is only shown for matches contained in the set.
   * Undefined = unknown (CTA hidden to avoid dead-end links).
   */
  liveScoredMatchIds?: ReadonlySet<string>;
}

/** Which side won, from game wins. Neither, on a tie or an unfinished match. */
const winnerSides = (match: Match, isCompleted: boolean) => {
  const hasGameWins = match.team1_game_wins !== undefined && match.team2_game_wins !== undefined;
  if (!isCompleted || !hasGameWins) return { team1: false, team2: false };

  const team1 = match.team1_game_wins || 0;
  const team2 = match.team2_game_wins || 0;
  return { team1: team1 > team2, team2: team2 > team1 };
};

const teamNames = (match: Match) => ({
  team1Name: match.team1Details?.name || 'Unknown Team',
  team2Name: match.team2Details?.name || 'Unknown Team',
});

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onEdit,
  onDelete,
  showInteractions = true,
  prefetchedH2H,
  isBatchH2HLoading = false,
  liveScoredMatchIds,
}) => {
  const { isAdminAccessGranted } = useAdminAccess();

  // One question, asked once. Every branch below reads the answer.
  const status = deriveMatchStatus(match);
  const isCompleted = status === 'completed';
  const { team1Name, team2Name } = teamNames(match);

  const { prediction, isUpsetResult } = useMatchPrediction({
    team1Details: match.team1Details,
    team2Details: match.team2Details,
    isCompleted,
    winnerId: match.winnerId,
    prefetchedH2H,
  });

  const winners = winnerSides(match, isCompleted);
  const isAnimating = useScoreAnimation(match.team1Score, match.team2Score);

  const { canScore } = useCanScoreMatch({
    team1_id: match.team1Id ?? null,
    team2_id: match.team2Id ?? null,
    iscompleted: match.iscompleted,
    status: match.status,
  });

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
        <div className="rounded-xl overflow-hidden bg-card">
          <MatchCardStatusBadge status={status} isUpsetResult={isUpsetResult} />

          <div className="px-3 py-2">
            <MatchCardTeamsRow
              match={match}
              team1Name={team1Name}
              team2Name={team2Name}
              isCompleted={isCompleted}
              winners={winners}
              isAnimating={isAnimating}
            />

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

            <MatchCardUpcomingExtras
              isCompleted={isCompleted}
              matchDate={match.date}
              prediction={prediction}
              team1Name={team1Name}
              team2Name={team2Name}
            />

            <MatchCardCtas
              match={match}
              isCompleted={isCompleted}
              canScore={canScore}
              team1Name={team1Name}
              team2Name={team2Name}
              liveScoredMatchIds={liveScoredMatchIds}
            />

            {isAdminAccessGranted && (
              <MatchCardAdminActions
                match={match}
                isCompleted={isCompleted}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}

            {showInteractions && isCompleted && (
              <MatchInteractions matchId={match.id} className="mt-2" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MatchCard);
