
import React from "react";
import { BracketRound, BracketTheme } from "../types/bracketTypes";
import TournamentMatchCard from "../TournamentMatchCard";

interface BracketColumnProps {
  round: BracketRound;
  theme: BracketTheme;
  onMatchClick?: (matchId: string) => void;
  className?: string;
}

const BracketColumn: React.FC<BracketColumnProps> = ({
  round,
  theme,
  onMatchClick,
  className = ""
}) => {
  return (
    <div className={`bracket-column ${className}`} style={{ minWidth: theme.spacing.matchWidth }}>
      {/* Round Header */}
      <div 
        className="text-xs font-medium mb-3 text-center px-2"
        style={{ 
          width: theme.spacing.matchWidth,
          color: theme.colors.text 
        }}
      >
        {round.title}
      </div>
      
      {/* Matches */}
      <div className="flex flex-col" style={{ gap: theme.spacing.rowGap }}>
        {round.matches.map((match, index) => (
          <div
            key={match.id}
            style={{
              width: theme.spacing.matchWidth,
              height: theme.spacing.matchHeight,
              marginTop: index > 0 ? theme.spacing.rowGap * Math.pow(2, round.matches.length > 2 ? 0 : 1) : 0
            }}
          >
            <TournamentMatchCard
              match={match}
              onMatchClick={onMatchClick}
              showSeeds={true}
              bracketType={round.matchType}
              fixedHeight={true}
              theme={theme}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketColumn;
