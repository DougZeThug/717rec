
import React from "react";
import { Badge } from "@/components/ui/badge";
import MatchCard from "./MatchCard";
import type { PlayoffMatch, Team } from "@/types";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { blueAmber } from "@/styles/design-system";

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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
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
  
  // Determine the variant for the badge based on the bracket type
  const badgeVariant = 
    type === 'Winners' ? 'default' : 
    type === 'Losers' ? 'secondary' : 
    type === 'Finals' ? 'blueorange' : 
    'outline';

  return (
    <div 
      className={cn(
        "flex flex-col space-y-4 relative z-10",
        roundIndex % 2 === 0 && isLight ? "bg-blue-50/20" : "",
        roundIndex % 2 === 0 && !isLight ? "bg-blue-900/5" : ""
      )}
    >
      <div className="text-center mb-2">
        <Badge 
          variant={badgeVariant}
          className={cn(
            "font-bold py-1.5 px-4",
            type === 'Winners' && isLight && "bg-gradient-to-r from-blue-500 to-blue-600",
            type === 'Losers' && isLight && "bg-gradient-to-r from-amber-500 to-amber-600",
            type === 'Finals' && isLight && "bg-gradient-to-r from-blue-500 to-amber-500"
          )}
        >
          {roundLabel}
        </Badge>
      </div>
      
      <div 
        className="flex flex-col relative" 
        style={{ gap: `${verticalSpacing}px` }}
      >
        {matches.map((match, matchIndex) => {
          const hasNextMatch = getNextMatch(match) !== null;
          
          return (
            <div 
              key={match.id} 
              className="relative" 
              data-match-id={match.id}
              data-position={match.position}
              data-round={match.round}
              data-type={match.matchType}
            >
              <MatchCard
                match={match}
                teams={teams}
                onEditMatch={onEditMatch}
                hasNextMatch={hasNextMatch}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoundColumn;
