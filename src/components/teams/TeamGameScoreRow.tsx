import React from "react";
import { Match } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TransitionLink } from "@/components/transitions/TransitionLink";
import { cn } from "@/lib/utils";

/**
 * Props for showing a single row of a match game score between two teams.
 */
interface TeamGameScoreRowProps {
  match: Match;
  teamId: string;
  highlightWinnerLoser?: boolean; // Added prop to selectively apply color
}

// Define a type for team details to avoid type errors
interface TeamDetails {
  team_id?: string;
  name?: string;
  image_url?: string | null;
  logo_url?: string | null;
  divisionname?: string | null;
}

export const TeamGameScoreRow: React.FC<TeamGameScoreRowProps> = ({ match, teamId, highlightWinnerLoser }) => {
  // Identify teams
  const homeTeam = match.team1Details || {} as TeamDetails;
  const awayTeam = match.team2Details || {} as TeamDetails;
  const homeTeamId = match.team1Id;
  const awayTeamId = match.team2Id;

  const homeName = homeTeam.name || "Unknown Team";
  const awayName = awayTeam.name || "Unknown Team";
  const homeLogo = homeTeam.image_url || homeTeam.logo_url || "";
  const awayLogo = awayTeam.image_url || awayTeam.logo_url || "";

  // Get game wins from match fields - directly use team1_game_wins and team2_game_wins
  const homeGameWins = match.team1_game_wins ?? 0;
  const awayGameWins = match.team2_game_wins ?? 0;

  // Determine winner/loser for coloring
  let winnerTeamId: string | null = null;
  let loserTeamId: string | null = null;
  if (typeof homeGameWins === "number" && typeof awayGameWins === "number") {
    if (homeGameWins > awayGameWins) {
      winnerTeamId = homeTeamId;
      loserTeamId = awayTeamId;
    } else if (awayGameWins > homeGameWins) {
      winnerTeamId = awayTeamId;
      loserTeamId = homeTeamId;
    }
  }

  // Compose row
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
            <AvatarFallback>{homeName.charAt(0)}</AvatarFallback>
          </Avatar>
        </TransitionLink>
        <TransitionLink to={`/teams/${homeTeamId}`} className="truncate hover:underline">
          <span
            className={cn(
              "truncate",
              "font-bebas uppercase tracking-wide", // 🟢 Apply font update for completed match team names
              highlightWinnerLoser && winnerTeamId === homeTeamId && "text-green-600 font-medium",
              highlightWinnerLoser && loserTeamId === homeTeamId && "text-red-500"
            )}
            title={homeName}
          >
            {homeName}
          </span>
        </TransitionLink>
      </div>
      {/* Game score - center */}
      <div className={cn(
        "flex items-center justify-center px-2 flex-shrink-0 whitespace-nowrap font-bold text-base md:text-lg min-w-[3ch] text-center",
        "font-mono" // Apply IBM Plex Mono to game scores
      )}>
        {homeGameWins} <span className="mx-1">–</span> {awayGameWins}
      </div>
      {/* Away - Right side */}
      <div className="flex items-center min-w-0 gap-x-2 flex-1 justify-end">
        <TransitionLink to={`/teams/${awayTeamId}`} className="truncate hover:underline">
          <span
            className={cn(
              "truncate text-right",
              "font-bebas uppercase tracking-wide", // 🟢 Apply font update for completed match team names
              highlightWinnerLoser && winnerTeamId === awayTeamId && "text-green-600 font-medium",
              highlightWinnerLoser && loserTeamId === awayTeamId && "text-red-500"
            )}
            title={awayName}
          >
            {awayName}
          </span>
        </TransitionLink>
        <TransitionLink to={`/teams/${awayTeamId}`} className="shrink-0">
          <Avatar className="h-7 w-7 md:h-8 md:w-8">
            <AvatarImage src={awayLogo} alt={awayName} />
            <AvatarFallback>{awayName.charAt(0)}</AvatarFallback>
          </Avatar>
        </TransitionLink>
      </div>
    </div>
  );
};

export default TeamGameScoreRow;
