
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

  if (section.rounds.length === 0) return null;

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
        
        {/* Improved CSS-based connector lines */}
        {section.rounds.length > 1 && (
          <div className="absolute inset-0 pointer-events-none">
            {section.rounds.slice(0, -1).map((round, roundIndex) => (
              <div key={`connectors-${roundIndex}`}>
                {round.matches.map((match, matchIndex) => {
                  const nextRound = section.rounds[roundIndex + 1];
                  if (!nextRound) return null;
                  
                  const targetMatchIndex = Math.floor(matchIndex / 2);
                  const targetMatch = nextRound.matches[targetMatchIndex];
                  
                  if (!targetMatch) return null;
                  
                  // Calculate positions using match center points
                  const sourceY = (matchIndex * (theme.spacing.matchHeight + theme.spacing.rowGap)) + (theme.spacing.matchHeight / 2) + 40;
                  const targetY = (targetMatchIndex * (theme.spacing.matchHeight + theme.spacing.rowGap)) + (theme.spacing.matchHeight / 2) + 40;
                  const sourceX = theme.spacing.matchWidth;
                  const targetX = theme.spacing.matchWidth + theme.spacing.columnGap;
                  const midX = sourceX + (theme.spacing.columnGap / 2);
                  
                  return (
                    <div
                      key={`connector-${roundIndex}-${matchIndex}`}
                      className="absolute"
                      style={{
                        left: roundIndex * (theme.spacing.matchWidth + theme.spacing.columnGap),
                        top: 0,
                        width: theme.spacing.columnGap,
                        height: '100%',
                        pointerEvents: 'none'
                      }}
                    >
                      {/* Horizontal line from match center */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: sourceY,
                          width: theme.spacing.columnGap / 2,
                          height: '2px',
                          backgroundColor: getSectionColor(),
                          opacity: 0.7
                        }}
                      />
                      
                      {/* Vertical connector line - only for odd-indexed matches */}
                      {matchIndex % 2 === 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: theme.spacing.columnGap / 2,
                            top: Math.min(sourceY, sourceY - (theme.spacing.matchHeight + theme.spacing.rowGap)),
                            width: '2px',
                            height: Math.abs(theme.spacing.matchHeight + theme.spacing.rowGap),
                            backgroundColor: getSectionColor(),
                            opacity: 0.7
                          }}
                        />
                      )}
                      
                      {/* Horizontal line to target match center */}
                      {matchIndex % 2 === 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: theme.spacing.columnGap / 2,
                            top: targetY,
                            width: theme.spacing.columnGap / 2,
                            height: '2px',
                            backgroundColor: getSectionColor(),
                            opacity: 0.7
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BracketSection;
