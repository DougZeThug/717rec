
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import BracketsViewerComponent from "./BracketsViewer";
import DoubleEliminationBracket from "./DoubleEliminationBracket";

interface SimpleBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const SimpleBracket: React.FC<SimpleBracketProps> = ({ bracket, onMatchClick }) => {
  console.log('SimpleBracket rendering with bracket:', {
    id: bracket.id,
    name: bracket.name,
    format: bracket.format,
    matchesCount: bracket.matches?.length || 0
  });

  // Use the new BracketsViewer for better visualization
  // Fall back to the custom implementation if needed
  const useBracketsViewer = true; // Can be made configurable later

  if (useBracketsViewer) {
    return (
      <BracketsViewerComponent 
        bracket={bracket} 
        onMatchClick={onMatchClick} 
      />
    );
  }

  // Fallback to custom implementation
  return (
    <DoubleEliminationBracket 
      bracket={bracket} 
      onMatchClick={onMatchClick} 
    />
  );
};

export default SimpleBracket;
