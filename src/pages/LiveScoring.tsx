import { ArrowLeft, CalendarX, Construction } from 'lucide-react';
import React from 'react';
import { Link, useParams } from 'react-router';

import { LiveMatchView } from '@/components/live-scoring/LiveMatchView';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useCanScoreMatch } from '@/hooks/live-scoring/useCanScoreMatch';
import { useLiveMatch } from '@/hooks/live-scoring/useLiveMatch';
import { useLiveMatchRealtime } from '@/hooks/live-scoring/useLiveMatchRealtime';
import { NotFoundError } from '@/types/errors';

const LiveScoring: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { bundle, derived, isLoading, error, isNotEnabled } = useLiveMatch(matchId);
  const { status: realtimeStatus } = useLiveMatchRealtime(matchId);
  const { canScore, isAdmin } = useCanScoreMatch(bundle?.match);

  let content: React.ReactNode;
  if (isLoading) {
    content = <LoadingState message="Loading match…" variant="section" size="lg" />;
  } else if (isNotEnabled) {
    content = (
      <EmptyState
        icon={Construction}
        title="Live scoring isn't enabled yet"
        description="The database update for live scoring hasn't been applied. Check back soon!"
      />
    );
  } else if (error instanceof NotFoundError) {
    content = (
      <EmptyState
        icon={CalendarX}
        title="Match not found"
        description="This match doesn't exist or was removed from the schedule."
      />
    );
  } else if (error || !bundle || !derived) {
    content = (
      <EmptyState
        icon={CalendarX}
        title="Couldn't load the match"
        description="Something went wrong loading live scoring. Please try again."
      />
    );
  } else if (!bundle.match.team1_id || !bundle.match.team2_id) {
    content = (
      <EmptyState
        icon={CalendarX}
        title="Teams not set"
        description="Live scoring opens once both teams are assigned to this match."
      />
    );
  } else {
    content = (
      <LiveMatchView
        matchId={bundle.match.id}
        bundle={bundle}
        derived={derived}
        canScore={canScore}
        isAdmin={isAdmin}
        realtimeStatus={realtimeStatus}
      />
    );
  }

  return (
    <main className="container mx-auto max-w-lg px-4 pb-24 pt-4">
      <Link
        to="/schedule"
        className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Schedule
      </Link>
      {content}
    </main>
  );
};

export default LiveScoring;
