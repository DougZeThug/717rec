
import React from "react";
import { Match } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TransitionLink } from "@/components/transitions/TransitionLink";
import { cn } from "@/lib/utils";

interface TeamGameScoreRowProps {
  match: Match;
  teamId: string;
}

interface TeamDetails {
  team_id?: string;
  name?: string;
  image_url?: string | null;
  logo_url?: string | null;
  divisionname?: string | null;
}

// Helper function to get the number of games won from team stats
function getGameScoresForTeams(match: Match, teamId: string) {
  // If stats are available, use them
  if (match.stats && Array.isArray(match.stats) && match.stats.length > 0) {
    const thisTeamStat = match.stats.find((s) => s.team_id === teamId);
    const opponentStat = match.stats.find((s) => s.team_id !== teamId);

    // Check if stats have games_won or game_wins field
    const thisTeamGames = thisTeamStat ? (thisTeamStat.games_won ?? thisTeamStat.game_wins ?? 0) : 0;
    const opponentGames = opponentStat ? (opponentStat.games_won ?? opponentStat.game_wins ?? 0) : 0;

    return {
      homeGameWins: thisTeamGames,
      awayGameWins: opponentGames,
    };
  }

  // fallback to match.team1_game_wins, team2_game_wins
  if (match.team1Id === teamId) {
    return {
      homeGameWins: match.team1_game_wins ?? 0,
      awayGameWins: match.team2_game_wins ?? 0,
    };
  } else {
    return {
      homeGameWins: match.team2_game_wins ?? 0,
      awayGameWins: match.team1_game_wins ?? 0,
    };
  }
}

export const TeamGameScoreRow: React.FC<TeamGameScoreRowProps> = ({ match, teamId }) => {
  // Check if match is completed to determine display
  const isCompleted = match.iscompleted ?? false;

  // Identify teams
  const isHome = match.team1Id === teamId;
  const homeTeam = isHome ? match.team1Details as TeamDetails : match.team2Details as TeamDetails;
  const awayTeam = isHome ? match.team2Details as TeamDetails : match.team1Details as TeamDetails;
  const homeTeamId = isHome ? match.team1Id : match.team2Id;
  const awayTeamId = isHome ? match.team2Id : match.team1Id;

  // Fallbacks for labels
  const homeName = homeTeam?.name ? homeTeam.name.toUpperCase() : "UNKNOWN TEAM";
  const awayName = awayTeam?.name ? awayTeam.name.toUpperCase() : "UNKNOWN TEAM";
  const homeLogo = homeTeam?.image_url || homeTeam?.logo_url || "";
  const awayLogo = awayTeam?.image_url || awayTeam?.logo_url || "";

  // Game scores: try to use stats, fallback to match fields
  const { homeGameWins, awayGameWins } = getGameScoresForTeams(match, teamId);

  return (
    <div className={cn(
      "flex items-center w-full justify-between gap-x-3 py-2",
      "text-sm md:text-base"
    )}>
      {/* Home - Left side */}
      <div className="flex items-center min-w-0 gap-x-2 flex-1">
        <TransitionLink to={`/teams/${homeTeamId}`} className="shrink-0">
          <Avatar className="h-7 w-7 md:h-8 md:w-8">
            <AvatarImage src={homeLogo} alt={homeName} />
            <AvatarFallback className="font-bebas font-bold uppercase">{homeName.charAt(0)}</AvatarFallback>
          </Avatar>
        </TransitionLink>
        <TransitionLink to={`/teams/${homeTeamId}`} className="truncate hover:underline">
          <span className="truncate font-bebas font-bold uppercase tracking-wide" title={homeName}>{homeName}</span>
        </TransitionLink>
      </div>
      {/* Game score - center */}
      <div className="flex items-center justify-center px-2 flex-shrink-0 whitespace-nowrap min-w-[3ch] text-center font-mono font-medium text-base md:text-lg">
        {homeGameWins}
        <span className="mx-1 font-inter text-base">–</span>
        {awayGameWins}
      </div>
      {/* Away - Right side */}
      <div className="flex items-center min-w-0 gap-x-2 flex-1 justify-end">
        <TransitionLink to={`/teams/${awayTeamId}`} className="truncate hover:underline">
          <span className="truncate text-right font-bebas font-bold uppercase tracking-wide" title={awayName}>{awayName}</span>
        </TransitionLink>
        <TransitionLink to={`/teams/${awayTeamId}`} className="shrink-0">
          <Avatar className="h-7 w-7 md:h-8 md:w-8">
            <AvatarImage src={awayLogo} alt={awayName} />
            <AvatarFallback className="font-bebas font-bold uppercase">{awayName.charAt(0)}</AvatarFallback>
          </Avatar>
        </TransitionLink>
      </div>
    </div>
  );
};

export default TeamGameScoreRow;
