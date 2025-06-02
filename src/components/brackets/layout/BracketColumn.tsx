
import React from "react";
import { BracketRound, BracketTheme } from "../types/bracketTypes";
import TournamentMatchCard from "../TournamentMatchCard";

interface BracketColumnProps {
  round: BracketRound;
  theme: BracketTheme;
  onMatchClick?: (matchId: string) => void;
  roundIndex: number;
  className?: string;
}

const BracketColumn: React.FC<BracketColumnProps> = ({
  round,
  theme,
  onMatchClick,
  roundIndex,
  className = ""
}) => {
  return (
    <div 
      className={`bracket-column ${className}`}
      style={{ 
        width: theme.spacing.matchWidth,
        minHeight: '100%'
      }}
    >
      {/* Round Header */}
      <div 
        className="text-xs font-medium mb-4 text-center px-2"
        style={{ 
          color: theme.colors.text,
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {round.title}
      </div>
      
      {/* Matches Container - CSS Grid for even spacing */}
      <div 
        className="matches-container"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${round.matches.length}, ${theme.spacing.matchHeight}px)`,
          gap: `${theme.spacing.rowGap}px 0`,
          alignContent: 'start'
        }}
      >
        {round.matches.map((match) => (
          <div
            key={match.id}
            style={{
              width: theme.spacing.matchWidth,
              height: theme.spacing.matchHeight
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
