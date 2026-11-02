import { format } from 'date-fns';
import React from 'react';

import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Match } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

interface TeamGameScoreRowProps {
  match: Match;
  teamId: string;
  highlightWinnerLoser?: boolean;
}

interface TeamDetails {
  team_id?: string;
  name?: string;
  image_url?: string | null;
  logo_url?: string | null;
  divisionname?: string | null;
}

// Team logo that links to the team page. The name link beside it goes to the same
// place, so the logo link stays out of the tab order and the screen reader list.
// min-w-0 undoes TransitionLink's 44px minimum width, which took 16px from the name.
const TeamLogoLink: React.FC<{ name: string; logo: string }> = ({ name, logo }) => (
  <TransitionLink
    to={`/teams/${toTeamSlug(name)}`}
    className="shrink-0 min-w-0"
    aria-hidden="true"
    tabIndex={-1}
  >
    <Avatar className="size-7 md:size-8">
      <AvatarImage src={logo} alt={name} />
      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
    </Avatar>
  </TransitionLink>
);

// Team name that links to the team page; the caller sets winner / loser colours
const TeamNameLink: React.FC<{ name: string; labelClassName: string }> = ({
  name,
  labelClassName,
}) => (
  <TransitionLink to={`/teams/${toTeamSlug(name)}`} className="hover:underline">
    <span className={labelClassName} title={name}>
      {name}
    </span>
  </TransitionLink>
);

/** Match row with date, linked team names/logos, and game wins; can color winner and loser. */
const TeamGameScoreRowComponent: React.FC<TeamGameScoreRowProps> = ({
  match,
  teamId: _teamId,
  highlightWinnerLoser,
}) => {
  // Identify teams
  const homeTeam = match.team1Details || ({} as TeamDetails);
  const awayTeam = match.team2Details || ({} as TeamDetails);
  const homeTeamId = match.team1Id;
  const awayTeamId = match.team2Id;

  const homeName = homeTeam.name || 'Unknown Team';
  const awayName = awayTeam.name || 'Unknown Team';
  const homeLogo = homeTeam.image_url || homeTeam.logo_url || '';
  const awayLogo = awayTeam.image_url || awayTeam.logo_url || '';

  // Get game wins from match fields
  const homeGameWins = match.team1_game_wins ?? 0;
  const awayGameWins = match.team2_game_wins ?? 0;

  // Format the match date if available
  const matchDate = match.date ? format(new Date(match.date), 'MMM d, yyyy') : null;

  // Determine winner/loser for coloring
  let winnerTeamId: string | null = null;
  let loserTeamId: string | null = null;
  if (typeof homeGameWins === 'number' && typeof awayGameWins === 'number') {
    if (homeGameWins > awayGameWins) {
      winnerTeamId = homeTeamId;
      loserTeamId = awayTeamId;
    } else if (awayGameWins > homeGameWins) {
      winnerTeamId = awayTeamId;
      loserTeamId = homeTeamId;
    }
  }

  return (
    <div className="flex flex-col w-full py-2">
      {/* Match date display */}
      {matchDate && <div className="text-xs text-muted-foreground mb-1 px-2">{matchDate}</div>}

      <div
        className={cn('flex items-center w-full justify-between gap-x-3', 'text-sm md:text-base')}
      >
        {/* Home - Left side */}
        <div className="flex items-center min-w-0 gap-x-2 flex-1">
          <TeamLogoLink name={homeName} logo={homeLogo} />
          <TeamNameLink
            name={homeName}
            labelClassName={cn(
              'line-clamp-2 break-words',
              'font-bebas uppercase tracking-wide',
              highlightWinnerLoser &&
                winnerTeamId === homeTeamId &&
                'text-green-700 dark:text-green-600 font-medium',
              highlightWinnerLoser && loserTeamId === homeTeamId && 'text-red-700 dark:text-red-500'
            )}
          />
        </div>
        {/* Game score - center */}
        <div
          className={cn(
            'flex items-center justify-center px-2 shrink-0 whitespace-nowrap font-bold text-base md:text-lg min-w-[3ch] text-center',
            'font-mono'
          )}
        >
          {homeGameWins} <span className="mx-1">–</span> {awayGameWins}
        </div>
        {/* Away - Right side */}
        <div className="flex items-center min-w-0 gap-x-2 flex-1 justify-end">
          <TeamNameLink
            name={awayName}
            labelClassName={cn(
              'line-clamp-2 break-words text-right',
              'font-bebas uppercase tracking-wide',
              highlightWinnerLoser &&
                winnerTeamId === awayTeamId &&
                'text-green-700 dark:text-green-600 font-medium',
              highlightWinnerLoser && loserTeamId === awayTeamId && 'text-red-700 dark:text-red-500'
            )}
          />
          <TeamLogoLink name={awayName} logo={awayLogo} />
        </div>
      </div>
    </div>
  );
};

// Memoized: rendered once per match in potentially long match-history lists.
const TeamGameScoreRow = React.memo(TeamGameScoreRowComponent);
TeamGameScoreRow.displayName = 'TeamGameScoreRow';

export default TeamGameScoreRow;
