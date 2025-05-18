
import React from "react";
import MatchCardHeader from "./MatchCardHeader";
import MatchTeamsSection from "./MatchTeamsSection";
import MatchStatusIndicator from "./MatchStatusIndicator";
import MatchGamesDots from "./MatchGamesDots";
import ChampionIndicator from "./ChampionIndicator";
import { useMatchCardStyles } from "./hooks/useMatchCardStyles";
import { useMatchCardState } from "./hooks/useMatchCardState";
import { useMatchCardInteractions } from "./hooks/useMatchCardInteractions";
import { useMatchCardAnimation } from "./hooks/useMatchCardAnimation";
import type { PlayoffMatch, Team } from "@/types";

interface PlayoffMatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  hasNextMatch: boolean;
  isUpdated?: boolean;
}

const PlayoffMatchCard: React.FC<PlayoffMatchCardProps> = ({
  match,
  teams,
  onEditMatch,
  hasNextMatch,
  isUpdated = false
}) => {
  const { matchCardClasses } = useMatchCardStyles(match);
  const { team1, team2, isFinal, hasBothTeams, isChampionshipMatch, hasWinner } = useMatchCardState(match, teams);
  const { handleCardClick, handleKeyDown, isInteractive } = useMatchCardInteractions({
    matchId: match.id,
    hasBothTeams,
    onEditMatch
  });
  const { animationStyle } = useMatchCardAnimation(isUpdated);

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={matchCardClasses}
      style={animationStyle}
    >
      <MatchCardHeader 
        round={match.round} 
        position={match.position} 
        matchType={match.matchType} 
        bestOf={match.bestOf} 
      />
      
      <MatchTeamsSection
        team1={team1}
        team2={team2}
        team1Score={match.team1Score}
        team2Score={match.team2Score}
        team1GameWins={match.team1GameWins}
        team2GameWins={match.team2GameWins}
        winnerId={match.winnerId}
        loserId={match.loserId}
      />
      
      <MatchStatusIndicator
        team1Id={match.team1Id}
        team2Id={match.team2Id}
        winnerId={match.winnerId}
        hasNextMatch={hasNextMatch}
      />
      
      {match.bestOf > 1 && match.team1GameWins !== undefined && match.team2GameWins !== undefined && (
        <MatchGamesDots 
          bestOf={match.bestOf} 
          team1GameWins={match.team1GameWins} 
          team2GameWins={match.team2GameWins} 
        />
      )}
      
      {isChampionshipMatch && hasWinner && (
        <ChampionIndicator team={match.winnerId === team1?.id ? team1 : team2} />
      )}
    </div>
  );
};

export default PlayoffMatchCard;
