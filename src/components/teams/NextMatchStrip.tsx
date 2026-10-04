import { Calendar, ChevronRight, Clock } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { matchDateParts } from '@/components/home/matchRowStyles';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import { getMatchDateKey } from '@/hooks/useMyNextMatch';
import { Match } from '@/types';

interface NextMatchStripProps {
  /** The team's next match that is still to be played. */
  match: Match;
  /** The team whose page this is, so the opponent is the other side. */
  teamId: string;
}

/**
 * "Next match" on a team page.
 *
 * The page used to show only past matches, so a visitor who was not signed in
 * had no way to see when a team plays next without finding the Schedule page
 * and searching. The data was already fetched for the page and thrown away.
 *
 * Times use the same clock as the Schedule page it links to, so the two agree.
 */
const NextMatchStrip: React.FC<NextMatchStripProps> = ({ match, teamId }) => {
  const isTeam1 = match.team1Id === teamId;
  const opponent = isTeam1 ? match.team2Details : match.team1Details;
  const opponentName = opponent?.name || 'To be decided';
  const { formattedDate, formattedTime } = matchDateParts(match.date);

  // The night and the card itself, as the home "My matches" rows do.
  const dayKey = getMatchDateKey(match);
  const scheduleHref = dayKey ? `/schedule?date=${dayKey}#match-${match.id}` : '/schedule';

  return (
    <section aria-label="Next match">
      <Card>
        <CardContent className="p-0">
          <Link
            to={scheduleHref}
            className="group flex min-h-11 items-center justify-between gap-3 p-4 rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Next match
              </p>
              <div className="flex items-center gap-2 min-w-0">
                <TeamLogo
                  imageUrl={opponent?.image_url || opponent?.logo_url}
                  teamName={opponentName}
                  size="sm"
                  rounded
                />
                <p className="truncate font-semibold">vs {opponentName}</p>
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  {formattedDate}
                </span>
                {formattedTime && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {formattedTime}
                  </span>
                )}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
              <span className="hidden sm:inline">See on Schedule</span>
              <ChevronRight
                className="size-5 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
              <span className="sr-only sm:hidden">See on Schedule</span>
            </span>
          </Link>
        </CardContent>
      </Card>
    </section>
  );
};

export default NextMatchStrip;
