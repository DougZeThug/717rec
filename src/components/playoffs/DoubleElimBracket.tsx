import React from "react";
import type { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import RoundColumn from "./RoundColumn";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import ChampionDisplay from "./celebration/ChampionDisplay";
import { getBracketConnectorPaths } from "./BracketUtils";

interface DoubleElimBracketProps {
  winners: PlayoffMatch[][];
  losers: PlayoffMatch[][];
  finals: PlayoffMatch[];
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

/**
 * Specialized component for rendering double elimination brackets with separate columns for
 * winners bracket, losers bracket, and finals
 */
const DoubleElimBracket: React.FC<DoubleElimBracketProps> = ({
  winners,
  losers,
  finals,
  bracket,
  teams,
  onEditMatch
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [showChampion, setShowChampion] = React.useState(true);
  
  // Find the champion if the tournament is complete
  const champion = React.useMemo(() => {
    if (finals.length > 0) {
      const lastFinals = finals[finals.length - 1];
      
      if (lastFinals.winnerId) {
        return teams.find(team => team.id === lastFinals.winnerId) || null;
      }
    }
    
    return null;
  }, [finals, teams]);

  // Calculate connector paths for each bracket section
  const winnersConnectorPaths = React.useMemo(() => {
    const flattened = winners.flatMap(round => round);
    return getBracketConnectorPaths(flattened);
  }, [winners]);

  const losersConnectorPaths = React.useMemo(() => {
    const flattened = losers.flatMap(round => round);
    return getBracketConnectorPaths(flattened);
  }, [losers]);

  // Get connector paths between winners and losers brackets
  const crossConnectorPaths = React.useMemo(() => {
    // This would need custom logic to connect winners to losers
    // For simplicity, we'll keep this empty for now
    return [];
  }, []);

  // Calculate bracket visualization paths for connectors to finals
  const finalsConnectorPaths = React.useMemo(() => {
    return getBracketConnectorPaths(finals);
  }, [finals]);

  // Function to calculate vertical spacing based on round index
  const getVerticalSpacing = (roundIndex: number): number => {
    // We want less space in later rounds
    if (roundIndex >= 3) return 2;
    if (roundIndex >= 2) return 3;
    return 4;
  };

  // Function to find the next match for a given match
  const getNextMatch = (match: PlayoffMatch): PlayoffMatch | null => {
    // First check in winners bracket
    for (const round of winners) {
      const nextMatch = round.find(m => m.id === match.nextWinMatchId);
      if (nextMatch) return nextMatch;
    }
    
    // Then check in losers bracket
    for (const round of losers) {
      const nextMatch = round.find(m => m.id === match.nextWinMatchId);
      if (nextMatch) return nextMatch;
    }
    
    // Finally check in finals
    return finals.find(m => m.id === match.nextWinMatchId) || null;
  };

  return (
    <div className="overflow-auto my-4 relative">
      <div className={cn(
        "flex flex-col space-y-6 min-w-max p-6 rounded-lg",
        isLight 
          ? "bg-gradient-to-br from-white to-blue-50/10" 
          : "bg-gradient-to-br from-gray-900/80 to-gray-800/80"
      )}>
        {/* Mobile layout (stack) for small screens */}
        <div className="block sm:hidden space-y-10">
          {/* Winners Bracket Section */}
          <div className="relative">
            <h3 className="text-lg font-bold mb-4 text-center">Winners Bracket</h3>
            <div className="flex space-x-16 relative">
              {winners.map((roundMatches, roundIndex) => (
                <RoundColumn
                  key={`winners-${roundIndex}`}
                  round={String(roundIndex + 1)}
                  type="winners"
                  matches={roundMatches}
                  teams={teams}
                  onEditMatch={onEditMatch}
                  verticalSpacing={getVerticalSpacing(roundIndex)}
                  roundIndex={roundIndex}
                  getNextMatch={(match) => getNextMatch(match)}
                />
              ))}
              {/* SVG layer for winners bracket connectors */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{ overflow: 'visible' }}
              >
                {winnersConnectorPaths.map((path, i) => (
                  <path
                    key={`winner-connector-${i}`}
                    d={path}
                    fill="none"
                    stroke={isLight ? "#9ca3af" : "#6b7280"}
                    strokeWidth="2"
                    strokeDasharray={path.includes('M') && path.includes('C') ? "0" : "0"}
                    className="transition-colors duration-300"
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4"></div>
          
          {/* Losers Bracket Section */}
          <div className="relative">
            <h3 className="text-lg font-bold mb-4 text-center">Losers Bracket</h3>
            <div className="flex space-x-16 relative">
              {losers.map((roundMatches, roundIndex) => (
                <RoundColumn
                  key={`losers-${roundIndex}`}
                  round={String(roundIndex + 1)}
                  type="losers"
                  matches={roundMatches}
                  teams={teams}
                  onEditMatch={onEditMatch}
                  verticalSpacing={getVerticalSpacing(roundIndex)}
                  roundIndex={roundIndex}
                  getNextMatch={(match) => getNextMatch(match)}
                />
              ))}
              {/* SVG layer for losers bracket connectors */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{ overflow: 'visible' }}
              >
                {losersConnectorPaths.map((path, i) => (
                  <path
                    key={`loser-connector-${i}`}
                    d={path}
                    fill="none"
                    stroke={isLight ? "#9ca3af" : "#6b7280"}
                    strokeWidth="2"
                    strokeDasharray={path.includes('M') && path.includes('C') ? "0" : "0"}
                    className="transition-colors duration-300"
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4"></div>
          
          {/* Finals Section */}
          {finals.length > 0 && (
            <div className="relative">
              <h3 className="text-lg font-bold mb-4 text-center">Finals</h3>
              <div className="flex justify-center relative">
                <RoundColumn
                  key="finals"
                  round="Finals"
                  type="finals"
                  matches={finals}
                  teams={teams}
                  onEditMatch={onEditMatch}
                  verticalSpacing={2}
                  roundIndex={0}
                  getNextMatch={(match) => getNextMatch(match)}
                />
                {/* SVG layer for finals connectors */}
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none z-0"
                  style={{ overflow: 'visible' }}
                >
                  {finalsConnectorPaths.map((path, i) => (
                    <path
                      key={`finals-connector-${i}`}
                      d={path}
                      fill="none"
                      stroke={isLight ? "#9ca3af" : "#6b7280"}
                      strokeWidth="2"
                      className="transition-colors duration-300"
                    />
                  ))}
                </svg>
              </div>
            </div>
          )}
        </div>
        
        {/* Desktop layout (3-column grid) for medium screens and up */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-6">
          {/* Left Column: Winners Bracket */}
          <div className="relative">
            <h3 className="text-lg font-bold mb-4">Winners Bracket</h3>
            <div className="flex space-x-16 relative">
              {winners.map((roundMatches, roundIndex) => (
                <RoundColumn
                  key={`winners-${roundIndex}`}
                  round={String(roundIndex + 1)}
                  type="winners"
                  matches={roundMatches}
                  teams={teams}
                  onEditMatch={onEditMatch}
                  verticalSpacing={getVerticalSpacing(roundIndex)}
                  roundIndex={roundIndex}
                  getNextMatch={(match) => getNextMatch(match)}
                />
              ))}
              {/* SVG layer for winners bracket connectors */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{ overflow: 'visible' }}
              >
                {winnersConnectorPaths.map((path, i) => (
                  <path
                    key={`winner-connector-${i}`}
                    d={path}
                    fill="none"
                    stroke={isLight ? "#9ca3af" : "#6b7280"}
                    strokeWidth="2"
                    className="transition-colors duration-300"
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* Middle Column: Finals */}
          <div className="flex flex-col items-center justify-end relative">
            <h3 className="text-lg font-bold mb-4">Finals</h3>
            {finals.length > 0 && (
              <div className="flex justify-center relative mt-auto">
                <RoundColumn
                  key="finals"
                  round="Finals"
                  type="finals"
                  matches={finals}
                  teams={teams}
                  onEditMatch={onEditMatch}
                  verticalSpacing={2}
                  roundIndex={0}
                  getNextMatch={(match) => getNextMatch(match)}
                />
              </div>
            )}
          </div>
          
          {/* Right Column: Losers Bracket */}
          <div className="relative">
            <h3 className="text-lg font-bold mb-4">Losers Bracket</h3>
            <div className="flex space-x-16 relative">
              {losers.map((roundMatches, roundIndex) => (
                <RoundColumn
                  key={`losers-${roundIndex}`}
                  round={String(roundIndex + 1)}
                  type="losers"
                  matches={roundMatches}
                  teams={teams}
                  onEditMatch={onEditMatch}
                  verticalSpacing={getVerticalSpacing(roundIndex)}
                  roundIndex={roundIndex}
                  getNextMatch={(match) => getNextMatch(match)}
                />
              ))}
              {/* SVG layer for losers bracket connectors */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{ overflow: 'visible' }}
              >
                {losersConnectorPaths.map((path, i) => (
                  <path
                    key={`loser-connector-${i}`}
                    d={path}
                    fill="none"
                    stroke={isLight ? "#9ca3af" : "#6b7280"}
                    strokeWidth="2"
                    className="transition-colors duration-300"
                  />
                ))}
              </svg>
            </div>
          </div>
          
          {/* SVG layer for cross-bracket connectors */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ overflow: 'visible' }}
          >
            {crossConnectorPaths.map((path, i) => (
              <path
                key={`cross-connector-${i}`}
                d={path}
                fill="none"
                stroke={isLight ? "#9ca3af" : "#6b7280"}
                strokeWidth="2"
                strokeDasharray="4"
                className="transition-colors duration-300"
              />
            ))}
          </svg>
        </div>
      </div>
      
      {/* Champion display modal when tournament is complete */}
      {champion && showChampion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ChampionDisplay 
            champion={champion} 
            onClose={() => setShowChampion(false)} 
            showConfetti={true}
          />
        </div>
      )}
    </div>
  );
};

export default DoubleElimBracket;
