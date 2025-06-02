
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
  console.log('🔍 BracketLayout: Rendering with data:', data);
  
  const winnersSection = data.sections.find(s => s.type === 'winners');
  const losersSection = data.sections.find(s => s.type === 'losers');
  const finalsSection = data.sections.find(s => s.type === 'finals');

  console.log('🔍 BracketLayout: Sections found:', {
    winners: !!winnersSection,
    losers: !!losersSection,
    finals: !!finalsSection,
    finalsRounds: finalsSection?.rounds.length || 0
  });

  return (
    <div 
      className={`bracket-layout min-h-screen ${className}`}
      style={{
        backgroundColor: '#2a2a2a',
        color: '#ffffff'
      }}
    >
      <div className="overflow-x-auto overflow-y-hidden min-h-screen">
        <div className="min-w-max p-8 relative" style={{ minWidth: '1400px' }}>
          
          {/* Three-column layout for double elimination */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-8 relative">
            
            {/* Left Column: Winners Bracket */}
            <div className="winners-column">
              {winnersSection && winnersSection.rounds.length > 0 ? (
                <div className="mb-6">
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
              ) : (
                <div className="text-center text-gray-500">No winners matches</div>
              )}
            </div>
            
            {/* Center Column: Finals */}
            <div className="finals-column flex flex-col items-center justify-start">
              {finalsSection && finalsSection.rounds.length > 0 ? (
                <div className="mb-6">
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
              ) : (
                <div className="text-center text-gray-500 mt-20">
                  <p>No finals matches</p>
                  <p className="text-xs mt-1">Finals will appear when bracket progresses</p>
                </div>
              )}
            </div>
            
            {/* Right Column: Losers Bracket */}
            <div className="losers-column">
              {losersSection && losersSection.rounds.length > 0 ? (
                <div className="mb-6">
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
              ) : (
                <div className="text-center text-gray-500">No losers matches</div>
              )}
            </div>
          </div>
          
          {/* Cross-bracket connectors */}
          {showConnectors && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" style={{ overflow: 'visible' }}>
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
