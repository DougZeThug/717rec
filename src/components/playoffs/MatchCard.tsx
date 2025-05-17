
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayoffMatch, Team } from "@/types";
import { cn } from "@/lib/utils";
import { matchUpdateAnimation } from "./animation/BracketAnimationUtils";
import { useMatchCardStyles } from "./match-card/hooks/useMatchCardStyles";
import { useMatchCardState } from "./match-card/hooks/useMatchCardState";
import TeamRow from "./match-card/TeamRow";
import MatchCardHeader from "./match-card/MatchCardHeader";
import MatchStatusIndicator from "./match-card/MatchStatusIndicator";
import MatchGamesDots from "./match-card/MatchGamesDots";
import ChampionIndicator from "./match-card/ChampionIndicator";

interface MatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  hasNextMatch: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
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
  
  // Animation style for updated matches
  const animationStyle = isUpdated ? { animation: matchUpdateAnimation } : {};

  return (
    <div className="relative flex">
      <Card 
        className={cardClasses}
        onClick={() => onEditMatch && match.team1Id && match.team2Id && onEditMatch(match.id)}
        style={animationStyle}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Match Header */}
            <MatchCardHeader 
              bestOf={match.bestOf} 
              seriesScore={seriesScoreText} 
              position={match.position}
            />

            {/* Team 1 Row */}
            <TeamRow
              team={team1}
              teamId={match.team1Id}
              teamSeed={team1Seed}
              score={match.team1Score}
              isWinner={match.team1Id === match.winnerId}
              matchType={match.matchType}
            />
            
            {/* Team 2 Row */}
            <TeamRow
              team={team2}
              teamId={match.team2Id}
              teamSeed={team2Seed}
              score={match.team2Score}
              isWinner={match.team2Id === match.winnerId}
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

export default MatchCard;
