
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
  // Separate sections for better layout control
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
      {/* Horizontal scrolling container for mobile */}
      <div className="min-w-max px-4 py-6">
        {/* Main bracket container with improved flow */}
        <div className="relative">
          {/* Winners and Finals in top row - connected visually */}
          <div className="flex items-start gap-8 mb-12">
            {winnersSection && (
              <BracketSection
                section={winnersSection}
                theme={theme}
                onMatchClick={onMatchClick}
              />
            )}
            
            {finalsSection && (
              <div className="relative">
                {/* Connection line from winners to finals */}
                {winnersSection && showConnectors && (
                  <div 
                    className="absolute left-0 top-12 w-8 h-0.5 -translate-x-8"
                    style={{ 
                      backgroundColor: theme.colors.finals,
                      opacity: 0.7,
                      top: `${theme.spacing.matchHeight / 2 + 40}px`
                    }}
                  />
                )}
                
                <BracketSection
                  section={finalsSection}
                  theme={theme}
                  onMatchClick={onMatchClick}
                />
              </div>
            )}
          </div>
          
          {/* Losers bracket in bottom row */}
          {losersSection && (
            <BracketSection
              section={losersSection}
              theme={theme}
              onMatchClick={onMatchClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BracketLayout;
