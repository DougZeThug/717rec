
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
        return theme.colors.winners;
      case 'losers':
        return theme.colors.losers;
      case 'finals':
        return theme.colors.finals;
      default:
        return theme.colors.border;
    }
  };

  if (section.rounds.length === 0) return null;

  return (
    <div className={`bracket-section relative ${className}`}>
      {/* Rounds Container - Horizontal flow */}
      <div 
        className="bracket-rounds-grid relative"
        style={{
          display: 'flex',
          gap: `${theme.spacing.columnGap}px`,
          alignItems: 'flex-start'
        }}
      >
        {section.rounds.map((round, roundIndex) => (
          <BracketColumn
            key={round.id}
            round={round}
            theme={theme}
            onMatchClick={onMatchClick}
            roundIndex={roundIndex}
          />
        ))}
        
        {/* Internal connectors only (no cross-bracket lines) */}
        {connections.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" style={{ overflow: 'visible' }}>
              {connections.map((connection, index) => (
                <g key={`${section.type}-connector-${index}`}>
                  <path
                    d={connection.path}
                    fill="none"
                    stroke={getSectionColor()}
                    strokeWidth="2"
                    opacity={0.7}
                    className="transition-colors duration-300"
                  />
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default BracketSection;
