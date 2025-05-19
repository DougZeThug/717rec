
import React, { useMemo, useState } from "react";
import type { PlayoffBracket, Team } from "@/types";
import RoundColumn from "./RoundColumn";
import { getBracketConnectorPaths, getVerticalSpacing, getNextMatch } from "./BracketUtils";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { blueAmber } from "@/styles/design-system";
import ChampionDisplay from "./celebration/ChampionDisplay";
import { usePlayoffBracketData, BracketMatchesByType } from "@/hooks/usePlayoffBracketData";
import DoubleElimBracket from "./DoubleElimBracket";
import { BRACKET_FORMATS } from "@/constants/brackets";

interface BracketViewProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

const BracketView: React.FC<BracketViewProps> = ({ bracket, teams, onEditMatch }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [showChampion, setShowChampion] = useState(true);
  
  // Get organized bracket data by match type (winners, losers, finals)
  const { bracketMatchesByType } = usePlayoffBracketData(bracket.id);

  // Check if we should use the double elimination layout
  const isDoubleElimination = bracket.format === BRACKET_FORMATS.DOUBLE;
  
  // If we have a double elimination bracket and the data is organized by type,
  // use the specialized double elimination component
  if (isDoubleElimination && bracketMatchesByType) {
    return (
      <DoubleElimBracket
        winners={bracketMatchesByType.winners}
        losers={bracketMatchesByType.losers}
        finals={bracketMatchesByType.finals}
        bracket={bracket}
        teams={teams}
        onEditMatch={onEditMatch}
      />
    );
  }

  // Get vertical spacing for each round
  const roundSpacing = useMemo(() => {
    if (!bracket?.matches) return [];
    return bracket.matches.reduce((acc: Record<number, number>, match) => {
      if (!acc[match.round]) {
        acc[match.round] = 0;
      }
      acc[match.round]++;
      return acc;
    }, {});
  }, [bracket?.matches]);
  
  // Group matches by round
  const matchesByRound = useMemo(() => {
    if (!bracket?.matches) return [];
    return bracket.matches.reduce((acc: Record<number, PlayoffMatch[]>, match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {});
  }, [bracket?.matches]);
  
  // Convert to array of rounds
  const rounds = useMemo(() => {
    return Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  }, [matchesByRound]);
  
  // Calculate bracket connector paths
  const connectorPaths = useMemo(() => {
    if (!bracket?.matches || rounds.length === 0) return [];
    return getBracketConnectorPaths(bracket.matches, rounds);
  }, [bracket?.matches, rounds]);
  
  // Find the champion if the bracket is complete
  const champion = useMemo(() => {
    if (!bracket?.matches || !bracket.champion) return null;
    
    // Find the team with the champion ID
    return teams.find(team => team.id === bracket.champion) || null;
  }, [bracket?.matches, bracket.champion, teams]);
  
  if (!bracket || !bracket.matches) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-medium">No bracket data available</h3>
      </div>
    );
  }
  
  return (
    <div className="overflow-auto my-4 relative">
      <div className={cn(
        "flex space-x-16 relative min-w-max p-6 rounded-lg",
        isLight 
          ? "bg-gradient-to-br from-white to-blue-50/10" 
          : "bg-gradient-to-br from-gray-900/80 to-gray-800/80"
      )}>
        {rounds.map((round) => (
          <RoundColumn
            key={`round-${round}`}
            round={String(round)}
            matches={matchesByRound[round]}
            teams={teams}
            onEditMatch={onEditMatch}
            verticalSpacing={getVerticalSpacing(roundSpacing[round])}
          />
        ))}
        
        {/* SVG layer for bracket connectors */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ overflow: 'visible' }}
        >
          {connectorPaths.map((path, i) => (
            <path
              key={`connector-${i}`}
              d={path}
              fill="none"
              stroke={isLight ? "#9ca3af" : "#6b7280"}
              strokeWidth="2"
              className="transition-colors duration-300"
            />
          ))}
        </svg>
      </div>
      
      {/* Champion display if tournament is complete */}
      {champion && showChampion && (
        <ChampionDisplay
          champion={champion}
          isVisible={showChampion}
          onClose={() => setShowChampion(false)}
        />
      )}
    </div>
  );
};

export default BracketView;
