
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
  const { cardClasses } = useMatchCardStyles(match.matchType, onEditMatch, isUpdated, 
    match.matchType === 'play-in' || match.matchType === 'play-in-2', 
    match.matchType === 'finals' && match.round > 3,
    match.round);
    
  const { 
    team1, team2, winner, team1Seed, team2Seed, isPending, 
    isComplete, isPlayIn, isResetMatch, seriesScoreText 
  } = useMatchCardState({ match, teams });
  
  const { handleCardClick, handleKeyDown, isInteractive } = useMatchCardInteractions({
    matchId: match.id,
    hasBothTeams: !!match.team1Id && !!match.team2Id,
    onEditMatch
  });
  
  const { animationStyle } = useMatchCardAnimation(isUpdated);
  
  // Determine additional properties needed for components
  const isChampionshipMatch = match.matchType === 'finals' && match.round === 1;
  const hasWinner = !!match.winnerId;

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cardClasses}
      style={animationStyle}
    >
      <MatchCardHeader 
        bestOf={match.bestOf} 
        seriesScore={seriesScoreText} 
        position={match.position} 
      />
      
      <MatchTeamsSection
        team1={team1}
        team2={team2}
        team1Id={match.team1Id}
        team2Id={match.team2Id}
        team1Seed={team1Seed}
        team2Seed={team2Seed}
        team1Score={match.team1Score}
        team2Score={match.team2Score}
        winnerId={match.winnerId}
        matchType={match.matchType}
      />
      
      <MatchStatusIndicator
        isPending={isPending}
        isComplete={isComplete}
        isResetMatch={isResetMatch}
        matchType={match.matchType}
        winnerId={match.winnerId}
      />
      
      {match.bestOf > 1 && match.team1GameWins !== undefined && match.team2GameWins !== undefined && (
        <MatchGamesDots 
          games={(match.games || [])}
          team1Id={match.team1Id}
          team2Id={match.team2Id}
          winnerId={match.winnerId}
        />
      )}
      
      {isChampionshipMatch && hasWinner && (
        <ChampionIndicator winner={winner} />
      )}
    </div>
  );
};

export default PlayoffMatchCard;
