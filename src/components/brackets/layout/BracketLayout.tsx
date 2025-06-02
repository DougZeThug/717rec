
import React from "react";
import { ProcessedBracketData, BracketTheme } from "../types/bracketTypes";
import BracketSection from "./BracketSection";

interface BracketLayoutProps {
  data: ProcessedBracketData;
  theme: BracketTheme;
  onMatchClick?: (matchId: string) => void;
  showConnectors?: boolean;
  className?: string;
}

const BracketLayout: React.FC<BracketLayoutProps> = ({
  data,
  theme,
  onMatchClick,
  showConnectors = true,
  className = ""
}) => {
  // Separate sections for Challonge-style horizontal layout
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  return (
    <div 
      className={`bracket-layout overflow-x-auto ${className}`}
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text
      }}
    >
      {/* Horizontal scrolling container */}
      <div className="min-w-max px-6 py-8">
        <div className="relative" style={{ width: data.dimensions.width, height: data.dimensions.height }}>
          
          {/* Winners Bracket - Dynamic Top Position */}
          {winnersSection && (
            <div className="absolute" style={{ left: 0, top: 0 }}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-center" style={{ color: theme.colors.winners }}>
                  Winners Bracket
                </h3>
              </div>
              <BracketSection
                section={winnersSection}
                theme={theme}
                onMatchClick={onMatchClick}
                connections={showConnectors ? data.connections.filter(c => c.type === 'winners') : []}
              />
            </div>
          )}
          
          {/* Losers Bracket - Dynamic Bottom Position */}
          {losersSection && losersSection.rounds.length > 0 && (
            <div className="absolute" style={{ 
              left: 0, 
              top: winnersSection ? winnersSection.rounds[0]?.position?.y + 280 || 400 : 60 
            }}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-center" style={{ color: theme.colors.losers }}>
                  Losers Bracket
                </h3>
              </div>
              <BracketSection
                section={losersSection}
                theme={theme}
                onMatchClick={onMatchClick}
                connections={showConnectors ? data.connections.filter(c => c.type === 'losers') : []}
              />
            </div>
          )}
          
          {/* Grand Finals - Right Side with Dynamic Position */}
          {finalsSection && finalsSection.rounds.length > 0 && (
            <div className="absolute" style={{ 
              left: Math.max(
                (winnersSection?.rounds.length || 0) * (theme.spacing.matchWidth + theme.spacing.columnGap) + 100,
                (losersSection?.rounds.length || 0) * (theme.spacing.matchWidth + theme.spacing.columnGap) + 100,
                800
              ), 
              top: finalsSection.rounds[0]?.position?.y || 120 
            }}>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-center" style={{ color: theme.colors.finals }}>
                  Grand Finals
                </h3>
              </div>
              <BracketSection
                section={finalsSection}
                theme={theme}
                onMatchClick={onMatchClick}
                connections={showConnectors ? data.connections.filter(c => c.type === 'finals') : []}
              />
            </div>
          )}
          
          {/* Visual flow indicators */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" style={{ overflow: 'visible' }}>
              {/* Subtle visual flow indicators */}
              {winnersSection && finalsSection && (
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                   refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={theme.colors.text} opacity="0.3" />
                  </marker>
                </defs>
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BracketLayout;
