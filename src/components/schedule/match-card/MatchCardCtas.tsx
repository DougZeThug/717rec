import { isToday, parseISO } from 'date-fns';
import { ClipboardList, Eye, Radio } from 'lucide-react';
import React from 'react';

import { MatchRecapDialog } from '@/components/live-scoring/MatchRecapDialog';
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Match } from '@/types';
import { isMatchOpenForScoring } from '@/utils/matchStatus';

// 44px tall, like every other button: these two were 40px.
const ctaClasses =
  'flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors';

interface MatchCardCtasProps {
  match: Match;
  isCompleted: boolean;
  canScore: boolean;
  /** True while the scorer check is still loading; nothing is offered until it answers. */
  isScoringAccessLoading?: boolean;
  team1Name: string;
  team2Name: string;
  liveScoredMatchIds?: ReadonlySet<string>;
}

/**
 * The one full-width button a card can offer, if any.
 *
 * A match still open for a score offers live scoring to whoever may score it.
 * On the match's own day everyone else (other teams, signed-out visitors) gets
 * "Watch live" instead, which opens the same page view-only (Doug, 2026-11-09).
 * A finished one offers its recap, but only when it was actually live-scored —
 * a match resulted by bulk entry or an approved report has nothing to show.
 */
export const MatchCardCtas: React.FC<MatchCardCtasProps> = ({
  match,
  isCompleted,
  canScore,
  isScoringAccessLoading = false,
  team1Name,
  team2Name,
  liveScoredMatchIds,
}) => {
  if (isMatchOpenForScoring(match) && canScore) {
    return (
      <div className="mt-1.5">
        <TransitionLink
          to={`/matches/${match.id}/live`}
          className={`${ctaClasses} bg-primary/10 text-primary-text hover:bg-primary/20`}
          aria-label={`Live score ${team1Name} vs ${team2Name}`}
        >
          <Radio className="size-4" aria-hidden />
          Live score this match
        </TransitionLink>
      </div>
    );
  }

  // Not while the scorer check loads: a scorer would see "Watch live" flash
  // before "Live score this match". Both teams must be set to have a match to
  // watch, and "today" is the date strip's today (DateStrip.tsx).
  const isMatchDay = match.date ? isToday(parseISO(match.date)) : false;
  const isWatchable =
    isMatchOpenForScoring(match) &&
    !canScore &&
    !isScoringAccessLoading &&
    Boolean(match.team1Id && match.team2Id) &&
    isMatchDay;

  if (isWatchable) {
    return (
      <div className="mt-1.5">
        <TransitionLink
          to={`/matches/${match.id}/live`}
          className={`${ctaClasses} bg-primary/10 text-primary-text hover:bg-primary/20`}
          aria-label={`Watch ${team1Name} vs ${team2Name} live`}
        >
          <Eye className="size-4" aria-hidden />
          Watch live
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
