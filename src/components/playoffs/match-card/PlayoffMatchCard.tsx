
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayoffMatch, Team } from "@/types";
import { cn } from "@/lib/utils";
import { useMatchCardStyles } from "./hooks/useMatchCardStyles";
import { useMatchCardState } from "./hooks/useMatchCardState";
import { useMatchCardAnimation } from "./hooks/useMatchCardAnimation";
import { useMatchCardInteractions } from "./hooks/useMatchCardInteractions";
import MatchCardHeader from "./MatchCardHeader";
import TeamRow from "./TeamRow";
import MatchStatusIndicator from "./MatchStatusIndicator";
import MatchGamesDots from "./MatchGamesDots";
import ChampionIndicator from "./ChampionIndicator";
import MatchTeamsSection from "./MatchTeamsSection";
import type MatchCardProps from "./types/index";

const PlayoffMatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  teams, 
  onEditMatch,
  hasNextMatch
}) => {
  const isUpdated = match.team1Score !== null || match.team2Score !== null;
  
  const {
    team1,
    team2,
    winner,
    team1Seed,
    team2Seed,
    isPending,
    isComplete,
    isPlayIn,
    isResetMatch,
    seriesScoreText
  } = useMatchCardState({ match, teams });
  
  const { cardClasses } = useMatchCardStyles(
    match.matchType,
    onEditMatch,
    isUpdated,
    isPlayIn,
    isResetMatch,
    match.round
  );
  
  const { animationStyle } = useMatchCardAnimation(isUpdated);
  
  const { handleCardClick, handleKeyDown, isInteractive } = useMatchCardInteractions({
    matchId: match.id,
    hasBothTeams: !!match.team1Id && !!match.team2Id,
    onEditMatch
  });
  
  return (
    <div className="relative flex">
      <Card 
        className={cardClasses}
        onClick={handleCardClick}
        style={animationStyle}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? "button" : undefined}
        aria-label={isInteractive ? `Edit match ${match.position}` : undefined}
        onKeyDown={handleKeyDown}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Match Header */}
            <MatchCardHeader 
              bestOf={match.bestOf} 
              seriesScore={seriesScoreText} 
              position={match.position}
            />

            {/* Teams Section */}
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

            {/* Match Status Display */}
            <MatchStatusIndicator
              isPending={isPending}
              isComplete={isComplete}
              isResetMatch={isResetMatch}
              matchType={match.matchType}
              winnerId={match.winnerId}
            />

            {/* Games detail section */}
            {match.games && match.games.length > 0 && (
              <MatchGamesDots
                games={match.games}
                team1Id={match.team1Id}
                team2Id={match.team2Id}
                winnerId={match.winnerId}
              />
            )}
            
            {/* Champion display for finals */}
            {winner && match.matchType === 'finals' && (
              <ChampionIndicator winner={winner} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayoffMatchCard;
