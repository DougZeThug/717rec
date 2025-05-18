
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
  
  return (
    <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-6 relative">
      {/* Left Column: Winners Bracket */}
      <BracketSection
        title="Winners Bracket"
        matches={winners}
        teams={teams}
        onEditMatch={onEditMatch}
        getVerticalSpacing={getVerticalSpacing}
        getNextMatch={getNextMatch}
        connectorPaths={winnersConnectorPaths}
      />
      
      {/* Middle Column: Finals */}
      <BracketFinalsColumn 
        matches={finals}
        teams={teams}
        onEditMatch={onEditMatch}
        getNextMatch={getNextMatch}
      />
      
      {/* Right Column: Losers Bracket */}
      <BracketSection
        title="Losers Bracket"
        matches={losers}
        teams={teams}
        onEditMatch={onEditMatch}
        getVerticalSpacing={getVerticalSpacing}
        getNextMatch={getNextMatch}
        connectorPaths={losersConnectorPaths}
      />
      
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
  );
};

export default DesktopLayout;
