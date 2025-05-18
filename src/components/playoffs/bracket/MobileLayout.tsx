
import React from "react";
import { PlayoffMatch, Team } from "@/types";
import BracketSection from "./BracketSection";

interface MobileLayoutProps {
  winners: PlayoffMatch[][];
  losers: PlayoffMatch[][];
  finals: PlayoffMatch[];
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  getVerticalSpacing: (roundIndex: number) => number;
  getNextMatch: (match: PlayoffMatch) => PlayoffMatch | null;
  winnersConnectorPaths: string[];
  losersConnectorPaths: string[];
  finalsConnectorPaths: string[];
}

/**
 * Mobile layout for double elimination bracket
 * Shows winners, losers, and finals sections stacked vertically
 */
const MobileLayout: React.FC<MobileLayoutProps> = ({
  winners,
  losers,
  finals,
  teams,
  onEditMatch,
  getVerticalSpacing,
  getNextMatch,
  winnersConnectorPaths,
  losersConnectorPaths,
  finalsConnectorPaths
}) => {
  return (
    <div className="block sm:hidden space-y-10">
      {/* Winners Bracket Section */}
      <BracketSection
        title="Winners Bracket"
        matches={winners}
        teams={teams}
        onEditMatch={onEditMatch}
        getVerticalSpacing={getVerticalSpacing}
        getNextMatch={getNextMatch}
        connectorPaths={winnersConnectorPaths}
      />
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4"></div>
      
      {/* Losers Bracket Section */}
      <BracketSection
        title="Losers Bracket"
        matches={losers}
        teams={teams}
        onEditMatch={onEditMatch}
        getVerticalSpacing={getVerticalSpacing}
        getNextMatch={getNextMatch}
        connectorPaths={losersConnectorPaths}
      />
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-4"></div>
      
      {/* Finals Section */}
      {finals.length > 0 && (
        <BracketSection
          title="Finals"
          matches={[finals]}
          teams={teams}
          onEditMatch={onEditMatch}
          getVerticalSpacing={() => 2}
          getNextMatch={getNextMatch}
          connectorPaths={finalsConnectorPaths}
        />
      )}
    </div>
  );
};

export default MobileLayout;
