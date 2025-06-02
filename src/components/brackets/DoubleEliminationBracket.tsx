
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import { processBracketData } from "./utils/bracketDataProcessor";
import { calculateLayout } from "./utils/layoutCalculator";
import BracketLayout from "./layout/BracketLayout";
import { challongeTheme } from "./styles/bracketThemes";

interface DoubleEliminationBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({
  bracket,
  onMatchClick
}) => {
  console.log('DoubleEliminationBracket rendering with:', {
    bracketId: bracket.id,
    matchesCount: bracket.matches?.length,
    teamsCount: bracket.teams?.length || 0
  });

  if (!bracket.matches || !Array.isArray(bracket.matches)) {
    return (
      <div className="text-center p-8" style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
        <h3 className="text-xl font-semibold mb-2">{bracket.title || bracket.name}</h3>
        <p className="text-gray-400">No matches data available</p>
      </div>
    );
  }

  if (bracket.matches.length === 0) {
    return (
      <div className="text-center p-8" style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
        <h3 className="text-xl font-semibold mb-2">{bracket.title || bracket.name}</h3>
        <p className="text-gray-400">No matches in this bracket yet</p>
      </div>
    );
  }

  // Process the bracket data
  const processedData = processBracketData(bracket);
  
  // Calculate layout with Challonge theme
  const layoutData = calculateLayout(processedData, challongeTheme);

  return (
    <div className="double-elimination-bracket">
      <BracketLayout
        data={layoutData}
        theme={challongeTheme}
        onMatchClick={onMatchClick}
        showConnectors={true}
      />
    </div>
  );
};

export default DoubleEliminationBracket;
