
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
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  return (
    <div 
      className={`bracket-layout min-h-screen ${className}`}
      style={{
        backgroundColor: '#2a2a2a',
        color: '#ffffff'
      }}
    >
      {/* Main container with horizontal scrolling */}
      <div className="overflow-x-auto overflow-y-hidden min-h-screen">
        <div className="min-w-max p-8" style={{ minWidth: '1400px' }}>
          
          {/* Winners Bracket - Top Section */}
          {winnersSection && winnersSection.rounds.length > 0 && (
            <div className="mb-16">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-center text-blue-400">
                  Winners Bracket
                </h2>
              </div>
              <BracketSection
                section={winnersSection}
                theme={theme}
                onMatchClick={onMatchClick}
                connections={showConnectors ? data.connections.filter(c => c.type === 'winners') : []}
              />
            </div>
          )}
          
          {/* Losers Bracket - Bottom Section */}
          {losersSection && losersSection.rounds.length > 0 && (
            <div className="mb-16">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-center text-orange-400">
                  Losers Bracket
                </h2>
              </div>
              <BracketSection
                section={losersSection}
                theme={theme}
                onMatchClick={onMatchClick}
                connections={showConnectors ? data.connections.filter(c => c.type === 'losers') : []}
              />
            </div>
          )}
          
          {/* Grand Finals - Right Side */}
          {finalsSection && finalsSection.rounds.length > 0 && (
            <div className="absolute top-8 right-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-center text-yellow-400">
                  Grand Finals
                </h2>
              </div>
              <BracketSection
                section={finalsSection}
                theme={theme}
                onMatchClick={onMatchClick}
                connections={showConnectors ? data.connections.filter(c => c.type === 'finals') : []}
              />
            </div>
          )}
          
          {/* Cross-bracket connectors */}
          {showConnectors && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" style={{ overflow: 'visible' }}>
                {/* Cross-bracket connections */}
                {data.connections
                  .filter(c => c.type === 'cross-bracket')
                  .map((connection, index) => (
                    <path
                      key={`cross-${index}`}
                      d={connection.path}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      opacity={0.6}
                    />
                  ))}
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BracketLayout;
