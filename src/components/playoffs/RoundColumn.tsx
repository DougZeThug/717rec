
import React from "react";
import { Badge } from "@/components/ui/badge";
import MatchCard from "./MatchCard";
import type { PlayoffMatch, Team } from "@/types";

interface RoundColumnProps {
  round: string;
  type: string;
  matches: PlayoffMatch[];
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  verticalSpacing: number;
  roundIndex: number;
  getNextMatch: (match: PlayoffMatch) => PlayoffMatch | null;
}

const RoundColumn: React.FC<RoundColumnProps> = ({
  round,
  type,
  matches,
  teams,
  onEditMatch,
  verticalSpacing,
  roundIndex,
  getNextMatch
}) => {
  // Calculate the round label
  const maxRound = Math.max(...matches.map(match => match.round));
  const roundNum = parseInt(round);
  
  const roundLabel = 
    type === 'Finals' ? "Finals" : 
    roundNum === maxRound && type === 'Winners' ? "Winners Finals" :
    roundNum === maxRound - 1 && type === 'Winners' ? "Winners Semifinals" : 
    roundNum === maxRound - 2 && type === 'Winners' ? "Winners Quarterfinals" : 
    roundNum === maxRound && type === 'Losers' ? "Losers Finals" :
    roundNum === maxRound - 1 && type === 'Losers' ? "Losers Semifinals" : 
    `${type} Round ${round}`;
  
  return (
    <div 
      className="flex flex-col space-y-4 relative" 
      style={{ zIndex: 10 }}
    >
      <div className="text-center">
        <Badge 
          variant={type === 'Winners' ? 'default' : type === 'Losers' ? 'secondary' : 'outline'}
          className="font-bold mb-2"
        >
          {roundLabel}
        </Badge>
      </div>
      
      <div className="flex flex-col" style={{ gap: `${verticalSpacing}px` }}>
        {matches.map((match) => {
          const hasNextMatch = getNextMatch(match) !== null;
          
          return (
            <MatchCard
              key={match.id}
              match={match}
              teams={teams}
              onEditMatch={onEditMatch}
              hasNextMatch={hasNextMatch}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RoundColumn;
