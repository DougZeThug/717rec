
import React from "react";
import { ProcessedBracketData, BracketTheme } from "../types/bracketTypes";
import BracketSection from "./BracketSection";
import ConnectorLines from "./ConnectorLines";

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
        {/* Bracket Sections - horizontal flow */}
        <div className="space-y-12">
          {data.sections.map(section => (
            <BracketSection
              key={`${section.type}-section`}
              section={section}
              theme={theme}
              onMatchClick={onMatchClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BracketLayout;
