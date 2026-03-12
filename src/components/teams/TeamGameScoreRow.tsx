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

export const TeamGameScoreRow: React.FC<TeamGameScoreRowProps> = ({
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
      {matchDate && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-2">{matchDate}</div>
      )}

      <div
        className={cn('flex items-center w-full justify-between gap-x-3', 'text-sm md:text-base')}
      >
        {/* Home - Left side */}
        <div className="flex items-center min-w-0 gap-x-2 flex-1">
          <TransitionLink to={`/teams/${toTeamSlug(homeName)}`} className="shrink-0">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src={homeLogo} alt={homeName} />
              <AvatarFallback>{homeName.charAt(0)}</AvatarFallback>
            </Avatar>
          </TransitionLink>
          <TransitionLink
            to={`/teams/${toTeamSlug(homeName)}`}
            className="truncate hover:underline"
          >
            <span
              className={cn(
                'truncate',
                'font-bebas uppercase tracking-wide',
                highlightWinnerLoser && winnerTeamId === homeTeamId && 'text-green-600 font-medium',
                highlightWinnerLoser && loserTeamId === homeTeamId && 'text-red-500'
              )}
              title={homeName}
            >
              {homeName}
            </span>
          </TransitionLink>
        </div>
        {/* Game score - center */}
        <div
          className={cn(
            'flex items-center justify-center px-2 flex-shrink-0 whitespace-nowrap font-bold text-base md:text-lg min-w-[3ch] text-center',
            'font-mono'
          )}
        >
          {homeGameWins} <span className="mx-1">–</span> {awayGameWins}
        </div>
        {/* Away - Right side */}
        <div className="flex items-center min-w-0 gap-x-2 flex-1 justify-end">
          <TransitionLink
            to={`/teams/${toTeamSlug(awayName)}`}
            className="truncate hover:underline"
          >
            <span
              className={cn(
                'truncate text-right',
                'font-bebas uppercase tracking-wide',
                highlightWinnerLoser && winnerTeamId === awayTeamId && 'text-green-600 font-medium',
                highlightWinnerLoser && loserTeamId === awayTeamId && 'text-red-500'
              )}
              title={awayName}
            >
              {awayName}
            </span>
          </TransitionLink>
          <TransitionLink to={`/teams/${toTeamSlug(awayName)}`} className="shrink-0">
            <Avatar className="h-7 w-7 md:h-8 md:w-8">
              <AvatarImage src={awayLogo} alt={awayName} />
              <AvatarFallback>{awayName.charAt(0)}</AvatarFallback>
            </Avatar>
          </TransitionLink>
        </div>
      </div>
    </div>
  );
};

export default TeamGameScoreRow;
