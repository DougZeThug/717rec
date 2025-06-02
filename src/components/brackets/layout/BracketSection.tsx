
import React from "react";
import { BracketSection as BracketSectionType, BracketTheme } from "../types/bracketTypes";
import BracketColumn from "./BracketColumn";

interface BracketSectionProps {
  section: BracketSectionType;
  theme: BracketTheme;
  onMatchClick?: (matchId: string) => void;
  connections?: any[];
  className?: string;
}

const BracketSection: React.FC<BracketSectionProps> = ({
  section,
  theme,
  onMatchClick,
  connections = [],
  className = ""
}) => {
  const getSectionColor = () => {
    switch (section.type) {
      case 'winners':
        return '#60a5fa'; // blue-400
      case 'losers':
        return '#fb923c'; // orange-400
      case 'finals':
        return '#fbbf24'; // yellow-400
      default:
        return '#9ca3af'; // gray-400
    }
  };

  if (section.rounds.length === 0) return null;

  return (
    <div className={`bracket-section relative ${className}`}>
      {/* Rounds Container - Clean Horizontal Flow */}
      <div 
        className="flex items-start relative"
        style={{ gap: '120px' }} // Fixed gap between rounds
      >
        {section.rounds.map((round, roundIndex) => (
          <BracketColumn
            key={round.id}
            round={round}
            theme={theme}
            onMatchClick={onMatchClick}
            roundIndex={roundIndex}
            sectionType={section.type}
          />
        ))}
        
        {/* Section connectors */}
        {connections.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <svg 
              className="w-full h-full" 
              style={{ 
                overflow: 'visible',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            >
              {connections.map((connection, index) => (
                <path
                  key={`${section.type}-connector-${index}`}
                  d={connection.path}
                  fill="none"
                  stroke={getSectionColor()}
                  strokeWidth="2"
                  opacity={0.8}
                  className="transition-colors duration-300"
                />
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default BracketSection;
