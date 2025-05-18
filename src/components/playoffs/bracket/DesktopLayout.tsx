
import React from "react";
import { PlayoffMatch, Team } from "@/types";
import { useTheme } from "next-themes";
import BracketSection from "./BracketSection";
import BracketFinalsColumn from "./BracketFinalsColumn";

interface DesktopLayoutProps {
  winners: PlayoffMatch[][];
  losers: PlayoffMatch[][];
  finals: PlayoffMatch[];
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  getVerticalSpacing: (roundIndex: number) => number;
  getNextMatch: (match: PlayoffMatch) => PlayoffMatch | null;
  winnersConnectorPaths: string[];
  losersConnectorPaths: string[];
  crossConnectorPaths: string[];
}

/**
 * Desktop layout for double elimination bracket
 * Shows winners, losers, and finals sections in a 3-column grid
 */
const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  winners,
  losers,
  finals,
  teams,
  onEditMatch,
  getVerticalSpacing,
  getNextMatch,
  winnersConnectorPaths,
  losersConnectorPaths,
  crossConnectorPaths
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  // Only render the grid if at least one section has matches
  const hasContent = winners.length > 0 || losers.length > 0 || finals.length > 0;
  
  if (!hasContent) {
    return null;
  }
  
  return (
    <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-6 relative">
      {/* Left Column: Winners Bracket */}
      {winners.length > 0 ? (
        <BracketSection
          title="Winners Bracket"
          matches={winners}
          teams={teams}
          onEditMatch={onEditMatch}
          getVerticalSpacing={getVerticalSpacing}
          getNextMatch={getNextMatch}
          connectorPaths={winnersConnectorPaths}
        />
      ) : (
        <div />  {/* Empty column placeholder to maintain grid layout */}
      )}
      
      {/* Middle Column: Finals */}
      {finals.length > 0 ? (
        <BracketFinalsColumn 
          matches={finals}
          teams={teams}
          onEditMatch={onEditMatch}
          getNextMatch={getNextMatch}
        />
      ) : (
        <div />  {/* Empty column placeholder to maintain grid layout */}
      )}
      
      {/* Right Column: Losers Bracket */}
      {losers.length > 0 ? (
        <BracketSection
          title="Losers Bracket"
          matches={losers}
          teams={teams}
          onEditMatch={onEditMatch}
          getVerticalSpacing={getVerticalSpacing}
          getNextMatch={getNextMatch}
          connectorPaths={losersConnectorPaths}
        />
      ) : (
        <div />  {/* Empty column placeholder to maintain grid layout */}
      )}
      
      {/* SVG layer for cross-bracket connectors - only render if both winners and losers brackets exist */}
      {winners.length > 0 && losers.length > 0 && (
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
      )}
    </div>
  );
};

export default DesktopLayout;
