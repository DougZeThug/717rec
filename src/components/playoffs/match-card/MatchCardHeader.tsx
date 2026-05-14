import React from 'react';

interface MatchCardHeaderProps {
  bestOf: number;
  seriesScore: string;
  position: number;
}

const MatchCardHeader: React.FC<MatchCardHeaderProps> = ({ bestOf, seriesScore, position }) => {
  return (
    <div className="flex justify-between items-center mb-1 text-xs text-muted-foreground dark:text-muted-foreground">
      <div className="flex items-center">
        <span>Best of {bestOf || 3}</span>
        {seriesScore && (
          <span className="ml-2 font-medium px-1.5 py-0.5 rounded bg-muted dark:bg-card">
            {seriesScore}
          </span>
        )}
      </div>
      <span className="text-xs font-mono">Match #{position}</span>
    </div>
  );
};

export default MatchCardHeader;
