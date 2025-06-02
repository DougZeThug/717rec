
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
      className={`bracket-layout relative ${className}`}
      style={{
        backgroundColor: theme.colors.background,
        minWidth: data.dimensions.width,
        minHeight: data.dimensions.height,
        color: theme.colors.text
      }}
    >
      {/* Bracket Sections */}
      <div className="bracket-sections flex flex-col gap-8 p-6">
        {data.sections.map(section => (
          <BracketSection
            key={`${section.type}-section`}
            section={section}
            theme={theme}
            onMatchClick={onMatchClick}
          />
        ))}
      </div>
      
      {/* Connector Lines */}
      {showConnectors && data.connections.length > 0 && (
        <ConnectorLines connections={data.connections} theme={theme} />
      )}
    </div>
  );
};

export default BracketLayout;
