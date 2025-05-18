
import React from "react";
import { PlayoffBracket, PlayoffMatch, Team } from "@/types";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useChampionDisplay } from "./bracket/hooks/useChampionDisplay";
import { useBracketConnectors } from "./bracket/hooks/useBracketConnectors";
import { getVerticalSpacing, getNextMatch } from "./bracket/utils/bracketLayoutUtils";
import MobileLayout from "./bracket/MobileLayout";
import DesktopLayout from "./bracket/DesktopLayout";

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
  
  // Get champion display data and UI
  const { championDisplay } = useChampionDisplay(finals, teams);
  
  // Get connector paths for bracket visualization
  const {
    winnersConnectorPaths,
    losersConnectorPaths,
    crossConnectorPaths,
    finalsConnectorPaths
  } = useBracketConnectors(winners, losers, finals);

  // Create a match finder function that uses our bracket data
  const findNextMatch = (match: PlayoffMatch): PlayoffMatch | null => {
    return getNextMatch(match, winners, losers, finals);
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
        <MobileLayout
          winners={winners}
          losers={losers}
          finals={finals}
          teams={teams}
          onEditMatch={onEditMatch}
          getVerticalSpacing={getVerticalSpacing}
          getNextMatch={findNextMatch}
          winnersConnectorPaths={winnersConnectorPaths}
          losersConnectorPaths={losersConnectorPaths}
          finalsConnectorPaths={finalsConnectorPaths}
        />
        
        {/* Desktop layout (3-column grid) for medium screens and up */}
        <DesktopLayout
          winners={winners}
          losers={losers}
          finals={finals}
          teams={teams}
          onEditMatch={onEditMatch}
          getVerticalSpacing={getVerticalSpacing}
          getNextMatch={findNextMatch}
          winnersConnectorPaths={winnersConnectorPaths}
          losersConnectorPaths={losersConnectorPaths}
          crossConnectorPaths={crossConnectorPaths}
        />
      </div>
      
      {/* Champion display modal when tournament is complete */}
      {championDisplay}
    </div>
  );
};

export default DoubleElimBracket;
