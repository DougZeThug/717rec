import { ClipboardList, Radio } from 'lucide-react';
import React from 'react';

import { MatchRecapDialog } from '@/components/live-scoring/MatchRecapDialog';
import { TransitionLink } from '@/components/transitions/TransitionLink';

const ctaClasses =
  'flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors';

interface CtaProps {
  matchId: string;
  team1Name: string;
  team2Name: string;
}

/** Takes a scorer to the live screen. Render only when they may score. */
export const LiveScoreCta: React.FC<CtaProps> = ({ matchId, team1Name, team2Name }) => (
  <div className="mt-1.5">
    <TransitionLink
      to={`/matches/${matchId}/live`}
      className={`${ctaClasses} bg-primary/10 text-primary hover:bg-primary/20`}
      aria-label={`Live score ${team1Name} vs ${team2Name}`}
    >
      <Radio className="size-4" aria-hidden />
      Live score this match
    </TransitionLink>
  </div>
);

/** Opens the recap. Render only for a match that was actually live-scored. */
export const MatchRecapCta: React.FC<CtaProps> = ({ matchId, team1Name, team2Name }) => (
  <div className="mt-1.5">
    <MatchRecapDialog
      matchId={matchId}
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
