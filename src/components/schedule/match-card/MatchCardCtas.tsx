import { ClipboardList, Radio } from 'lucide-react';
import React from 'react';

import { MatchRecapDialog } from '@/components/live-scoring/MatchRecapDialog';
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Match } from '@/types';
import { isMatchOpenForScoring } from '@/utils/matchStatus';

const ctaClasses =
  'flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors';

interface MatchCardCtasProps {
  match: Match;
  isCompleted: boolean;
  canScore: boolean;
  team1Name: string;
  team2Name: string;
  liveScoredMatchIds?: ReadonlySet<string>;
}

/**
 * The one full-width button a card can offer, if any.
 *
 * A match still open for a score offers live scoring to whoever may score it.
 * A finished one offers its recap, but only when it was actually live-scored —
 * a match resulted by bulk entry or an approved report has nothing to show.
 */
export const MatchCardCtas: React.FC<MatchCardCtasProps> = ({
  match,
  isCompleted,
  canScore,
  team1Name,
  team2Name,
  liveScoredMatchIds,
}) => {
  if (isMatchOpenForScoring(match) && canScore) {
    return (
      <div className="mt-1.5">
        <TransitionLink
          to={`/matches/${match.id}/live`}
          className={`${ctaClasses} bg-primary/10 text-primary hover:bg-primary/20`}
          aria-label={`Live score ${team1Name} vs ${team2Name}`}
        >
          <Radio className="size-4" aria-hidden />
          Live score this match
        </TransitionLink>
      </div>
    );
  }

  if (isCompleted && liveScoredMatchIds?.has(match.id)) {
    return (
      <div className="mt-1.5">
        <MatchRecapDialog
          matchId={match.id}
          team1Name={team1Name}
          team2Name={team2Name}
          trigger={
            <button
              type="button"
              className={`${ctaClasses} bg-muted text-foreground/80 hover:bg-muted/70`}
              aria-label={`View match recap for ${team1Name} vs ${team2Name}`}
            >
              <ClipboardList className="size-4" aria-hidden />
              View match recap
            </button>
          }
        />
      </div>
    );
  }

  return null;
};
