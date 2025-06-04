
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
  // Separate sections for clean horizontal layout
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
      {/* Horizontal scrolling container with simplified positioning */}
      <div className="min-w-max px-6 py-8">
        <div className="relative" style={{ width: data.dimensions.width, height: data.dimensions.height }}>
          
          {/* Winners Bracket - Fixed Top Position */}
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
          
          {/* Losers Bracket - Fixed Gap Below Winners */}
          {losersSection && losersSection.rounds.length > 0 && (
            <div className="absolute" style={{ 
              left: 0, 
              top: 280 // Fixed position below winners bracket
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
          
          {/* Grand Finals - Fixed Right Side Position */}
          {finalsSection && finalsSection.rounds.length > 0 && (
            <div className="absolute" style={{ 
              left: 800, // Fixed X position
              top: finalsSection.rounds[0]?.position?.y || 200 // Use calculated Y or fallback
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
          
          {/* Simple connector overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" style={{ overflow: 'visible' }}>
              {/* All connections rendered with simple styling */}
              {showConnectors && data.connections.map((connection, index) => (
                <path
                  key={`connector-${index}`}
                  d={connection.path}
                  fill="none"
                  stroke={theme.colors.border}
                  strokeWidth="2"
                  opacity={0.6}
                  className="transition-colors duration-300"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BracketLayout;
