
import React from "react";
import { BracketRound, BracketTheme } from "../types/bracketTypes";
import TournamentMatchCard from "../TournamentMatchCard";

interface BracketColumnProps {
  round: BracketRound;
  theme: BracketTheme;
  onMatchClick?: (matchId: string) => void;
  roundIndex: number;
  sectionType?: 'winners' | 'losers' | 'finals';
  className?: string;
}

const BracketColumn: React.FC<BracketColumnProps> = ({
  round,
  theme,
  onMatchClick,
  roundIndex,
  sectionType = 'winners',
  className = ""
}) => {
  const getRoundHeaderColor = () => {
    switch (sectionType) {
      case 'winners':
        return '#60a5fa'; // blue-400
      case 'losers':
        return '#fb923c'; // orange-400
      case 'finals':
        return '#fbbf24'; // yellow-400
      default:
        return '#9ca3af'; // gray-400
    }
  };

  const getVerticalSpacing = () => {
    // Increase spacing for later rounds
    return Math.pow(2, roundIndex) * 20 + 20;
  };

  return (
    <div 
      className={`bracket-column flex flex-col ${className}`}
      style={{ 
        width: theme.spacing.matchWidth,
        minWidth: theme.spacing.matchWidth
      }}
    >
      {/* Prominent Round Header */}
      <div 
        className="text-center mb-8 p-3 rounded-lg"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: `2px solid ${getRoundHeaderColor()}`,
          color: getRoundHeaderColor()
        }}
      >
        <div className="font-bold text-lg">
          {round.title}
        </div>
      </div>
      
      {/* Matches Container with Dynamic Spacing */}
      <div 
        className="flex flex-col"
        style={{ gap: `${getVerticalSpacing()}px` }}
      >
        {round.matches.map((match, matchIndex) => (
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
