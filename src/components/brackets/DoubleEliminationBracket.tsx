
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import TournamentBracket from "./TournamentBracket";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface DoubleEliminationBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({ 
  bracket, 
  onMatchClick 
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Group matches by bracket type
  const winnerMatches = bracket.matches.filter(match => 
    match.matchType === 'winners' || match.matchType === 'winner'
  );
  const loserMatches = bracket.matches.filter(match => 
    match.matchType === 'losers' || match.matchType === 'loser'
  );
  const finalMatches = bracket.matches.filter(match => 
    match.matchType === 'finals' || match.matchType === 'final'
  );

  // Create separate bracket data for each section
  const winnersBracket = {
    ...bracket,
    name: "Winners Bracket",
    matches: winnerMatches
  };

  const losersBracket = {
    ...bracket,
    name: "Losers Bracket", 
    matches: loserMatches
  };

  const finalsBracket = {
    ...bracket,
    name: "Finals",
    matches: finalMatches
  };

  return (
    <div className={cn(
      "w-full rounded-lg p-6 transition-colors duration-300",
      isDark 
        ? "bg-gray-900 border border-gray-700" 
        : "bg-white border border-gray-200"
    )}>
      <div className="mb-6">
        <h2 className={cn(
          "text-2xl font-bold transition-colors duration-300",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {bracket.name}
        </h2>
        <p className={cn(
          "text-sm mt-1 transition-colors duration-300",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          {bracket.format} • {bracket.state}
        </p>
      </div>

      <div className="space-y-8">
        {/* Winners Bracket */}
        {winnerMatches.length > 0 && (
          <div className={cn(
            "rounded-lg border p-4 transition-colors duration-300",
            isDark 
              ? "border-blue-800 bg-blue-900/20" 
              : "border-blue-200 bg-blue-50"
          )}>
            <h3 className={cn(
              "text-lg font-semibold mb-4 transition-colors duration-300",
              isDark ? "text-blue-300" : "text-blue-800"
            )}>
              Winners Bracket
            </h3>
            <TournamentBracket 
              bracket={winnersBracket} 
              onMatchClick={onMatchClick}
              bracketType="winners"
            />
          </div>
        )}

        {/* Losers Bracket */}
        {loserMatches.length > 0 && (
          <div className={cn(
            "rounded-lg border p-4 transition-colors duration-300",
            isDark 
              ? "border-orange-800 bg-orange-900/20" 
              : "border-orange-200 bg-orange-50"
          )}>
            <h3 className={cn(
              "text-lg font-semibold mb-4 transition-colors duration-300",
              isDark ? "text-orange-300" : "text-orange-800"
            )}>
              Losers Bracket
            </h3>
            <TournamentBracket 
              bracket={losersBracket} 
              onMatchClick={onMatchClick}
              bracketType="losers"
            />
          </div>
        )}

        {/* Finals */}
        {finalMatches.length > 0 && (
          <div className={cn(
            "rounded-lg border p-4 transition-colors duration-300",
            isDark 
              ? "border-purple-800 bg-purple-900/20" 
              : "border-purple-200 bg-purple-50"
          )}>
            <h3 className={cn(
              "text-lg font-semibold mb-4 transition-colors duration-300",
              isDark ? "text-purple-300" : "text-purple-800"
            )}>
              Finals
            </h3>
            <TournamentBracket 
              bracket={finalsBracket} 
              onMatchClick={onMatchClick}
              bracketType="finals"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
