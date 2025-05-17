
import React from 'react';
import MatchCard from './MatchCard';
import { Team } from '@/types';
import { cn } from '@/lib/utils';
import { PlayoffMatch } from '@/types';
import { getStaggeredDelay } from './animation/BracketAnimationUtils';
import RoundHeader from './rounds/RoundHeader';

interface RoundColumnProps {
  round: string;
  type: string;
  matches: PlayoffMatch[];
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  verticalSpacing: number;
  roundIndex: number;
  getNextMatch: (match: PlayoffMatch) => PlayoffMatch | null;
}

const RoundColumn: React.FC<RoundColumnProps> = ({
  round,
  type,
  matches,
  teams,
  onEditMatch,
  verticalSpacing,
  roundIndex,
  getNextMatch
}) => {
  return (
    <div className="flex flex-col space-y-4 relative z-10">
      {/* Round header */}
      <RoundHeader 
        round={round} 
        type={type} 
        roundIndex={roundIndex} 
        matchCount={matches.length}
      />
      
      <div 
        className={cn(
          "flex flex-col",
          verticalSpacing === 1 && "space-y-4",
          verticalSpacing === 2 && "space-y-24",
          verticalSpacing === 3 && "space-y-48",
          verticalSpacing === 4 && "space-y-96",
        )}
      >
        {matches.map((match, index) => {
          const nextMatch = getNextMatch(match);
          
          return (
            <div 
              key={match.id} 
              className="opacity-0"
              style={{ 
                animation: 'fade-in 0.5s ease-out forwards',
                animationDelay: getStaggeredDelay(index, 0.15),
                animationFillMode: 'forwards'
              }}
            >
              <MatchCard
                match={match}
                teams={teams}
                onEditMatch={onEditMatch}
                hasNextMatch={!!nextMatch}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoundColumn;
