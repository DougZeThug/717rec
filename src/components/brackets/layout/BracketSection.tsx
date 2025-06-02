
import React from "react";
import { BracketSection as BracketSectionType, BracketTheme } from "../types/bracketTypes";
import BracketColumn from "./BracketColumn";

interface BracketSectionProps {
  section: BracketSectionType;
  theme: BracketTheme;
  onMatchClick?: (matchId: string) => void;
  className?: string;
}

const BracketSection: React.FC<BracketSectionProps> = ({
  section,
  theme,
  onMatchClick,
  className = ""
}) => {
  const getSectionColor = () => {
    switch (section.type) {
      case 'winners':
        return theme.colors.winners;
      case 'losers':
        return theme.colors.losers;
      case 'finals':
        return theme.colors.finals;
      default:
        return theme.colors.border;
    }
  };

  return (
    <div className={`bracket-section ${className}`}>
      {/* Section Header */}
      <div 
        className="text-sm font-semibold mb-4 text-center"
        style={{ color: getSectionColor() }}
      >
        {section.title}
      </div>
      
      {/* Rounds */}
      <div className="flex gap-4">
        {section.rounds.map(round => (
          <BracketColumn
            key={round.id}
            round={round}
            theme={theme}
            onMatchClick={onMatchClick}
          />
        ))}
      </div>
    </div>
  );
};

export default BracketSection;
