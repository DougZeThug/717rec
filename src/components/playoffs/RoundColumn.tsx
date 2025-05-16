
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
  
  let roundLabel;
  
  if (type === 'play-in') {
    roundLabel = "Play-in Round";
  } else if (type === 'finals') {
    roundLabel = "Finals";
  } else if (type === 'winners') {
    if (roundNum === maxRound) {
      roundLabel = "Winners Finals";
    } else if (roundNum === maxRound - 1) {
      roundLabel = "Winners Semifinals";
    } else if (roundNum === maxRound - 2) {
      roundLabel = "Winners Quarterfinals";
    } else {
      roundLabel = `Winners Round ${round}`;
    }
  } else if (type === 'losers') {
    if (roundNum === maxRound) {
      roundLabel = "Losers Finals";
    } else if (roundNum === maxRound - 1) {
      roundLabel = "Losers Semifinals";
    } else {
      roundLabel = `Losers Round ${round}`;
    }
  } else {
    roundLabel = `${type} Round ${round}`;
  }
  
  // Determine the variant for the badge based on the bracket type
  const badgeVariant = 
    type === 'winners' ? 'default' : 
    type === 'losers' ? 'secondary' : 
    type === 'play-in' ? 'outline' :
    type === 'finals' ? 'blueorange' : 
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
            type === 'winners' && isLight && "bg-gradient-to-r from-blue-500 to-blue-600",
            type === 'losers' && isLight && "bg-gradient-to-r from-amber-500 to-amber-600",
            type === 'finals' && isLight && "bg-gradient-to-r from-blue-500 to-amber-500",
            type === 'play-in' && isLight && "bg-gradient-to-r from-purple-500 to-pink-500"
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
