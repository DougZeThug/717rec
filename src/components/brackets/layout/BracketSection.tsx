
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

  // Filter connections for this section
  const sectionConnections = connections.filter(conn => 
    conn.type === section.type || 
    (section.type === 'finals' && conn.type === 'finals')
  );

  return (
    <div className={`bracket-section relative ${className}`}>
      {/* Section Header */}
      <div 
        className="text-sm font-semibold mb-6 text-center"
        style={{ color: getSectionColor() }}
      >
        {section.title}
      </div>
      
      {/* Rounds Container - Horizontal CSS Grid */}
      <div 
        className="bracket-rounds-grid relative"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${section.rounds.length}, ${theme.spacing.matchWidth}px)`,
          gap: `0 ${theme.spacing.columnGap}px`,
          justifyContent: 'start'
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
        
        {/* Pre-calculated connector lines */}
        {sectionConnections.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" style={{ overflow: 'visible' }}>
              {sectionConnections.map((connection, index) => (
                <g key={`${section.type}-connector-${index}`}>
                  <path
                    d={connection.path}
                    fill="none"
                    stroke={getSectionColor()}
                    strokeWidth="2"
                    opacity={0.7}
                    className="transition-colors duration-300"
                  />
                  
                  {/* Optional: Add debugging dots to show exact connection points */}
                  {process.env.NODE_ENV === 'development' && connection.positioning && (
                    <>
                      <circle
                        cx={connection.positioning.fromPoint.x}
                        cy={connection.positioning.fromPoint.y}
                        r="3"
                        fill="red"
                        opacity={0.5}
                      />
                      <circle
                        cx={connection.positioning.toPoint.x}
                        cy={connection.positioning.toPoint.y}
                        r="3"
                        fill="blue"
                        opacity={0.5}
                      />
                    </>
                  )}
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
