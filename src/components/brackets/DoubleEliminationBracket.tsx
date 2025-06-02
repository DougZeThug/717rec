
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

      {/* Double Elimination Layout: Winners top, Losers bottom, Finals right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-max">
        {/* Left side: Winners and Losers brackets stacked */}
        <div className="lg:col-span-2 space-y-8">
          {/* Winners Bracket */}
          {winnerMatches.length > 0 && (
            <div className={cn(
              "rounded-lg border p-4 transition-colors duration-300",
              isDark 
                ? "border-blue-700 bg-blue-900/10" 
                : "border-blue-300 bg-blue-50"
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
                ? "border-orange-700 bg-orange-900/10" 
                : "border-orange-300 bg-orange-50"
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
        </div>

        {/* Right side: Finals */}
        {finalMatches.length > 0 && (
          <div className="lg:col-span-1 flex items-center justify-center">
            <div className={cn(
              "rounded-lg border p-6 w-full transition-colors duration-300",
              isDark 
                ? "border-yellow-700 bg-yellow-900/10" 
                : "border-yellow-300 bg-yellow-50"
            )}>
              <h3 className={cn(
                "text-lg font-semibold mb-4 text-center transition-colors duration-300",
                isDark ? "text-yellow-300" : "text-yellow-800"
              )}>
                Finals
              </h3>
              <TournamentBracket 
                bracket={finalsBracket} 
                onMatchClick={onMatchClick}
                bracketType="finals"
              />
            </div>
          </div>
        )}
      </div>

      {/* Connecting lines between brackets */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {/* Connecting line from winners to finals */}
        {winnerMatches.length > 0 && finalMatches.length > 0 && (
          <line 
            x1="66%" 
            y1="30%" 
            x2="75%" 
            y2="50%" 
            stroke={isDark ? "#6b7280" : "#9ca3af"}
            strokeWidth="2"
            className="transition-colors duration-300"
          />
        )}
        
        {/* Connecting line from losers to finals */}
        {loserMatches.length > 0 && finalMatches.length > 0 && (
          <line 
            x1="66%" 
            y1="70%" 
            x2="75%" 
            y2="50%" 
            stroke={isDark ? "#6b7280" : "#9ca3af"}
            strokeWidth="2"
            className="transition-colors duration-300"
          />
        )}
      </svg>
    </div>
  );
};

export default DoubleEliminationBracket;
