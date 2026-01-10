import { format } from 'date-fns';
import { Calendar, Swords } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

interface HeadToHeadSectionProps {
  team1Name: string;
  team2Name: string;
  team1Wins: number;
  team2Wins: number;
  gameWins1: number;
  gameWins2: number;
  lastPlayed: string | null;
  isFirstMeeting: boolean;
}

export const HeadToHeadSection: React.FC<HeadToHeadSectionProps> = ({
  team1Name,
  team2Name,
  team1Wins,
  team2Wins,
  gameWins1,
  gameWins2,
  lastPlayed,
  isFirstMeeting,
}) => {
  if (isFirstMeeting) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Swords className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-semibold text-lg mb-1">First Meeting</h3>
        <p className="text-sm text-muted-foreground">These teams have never played each other</p>
      </div>
    );
  }

  const totalMatches = team1Wins + team2Wins;
  const team1Pct = totalMatches > 0 ? (team1Wins / totalMatches) * 100 : 50;

  let seriesLeader = '';
  if (team1Wins > team2Wins) {
    seriesLeader = `${team1Name} leads ${team1Wins}-${team2Wins}`;
  } else if (team2Wins > team1Wins) {
    seriesLeader = `${team2Name} leads ${team2Wins}-${team1Wins}`;
  } else {
    seriesLeader = `Series tied ${team1Wins}-${team2Wins}`;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Swords className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Head-to-Head</h3>
      </div>

      {/* Series Record Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className={cn(team1Wins > team2Wins && 'font-semibold text-primary')}>
            {team1Wins} wins
          </span>
          <span className={cn(team2Wins > team1Wins && 'font-semibold text-primary')}>
            {team2Wins} wins
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden flex">
          <div
            className={cn(
              'h-full transition-all',
              team1Wins >= team2Wins ? 'bg-primary' : 'bg-primary/60'
            )}
            style={{ width: `${team1Pct}%` }}
          />
          <div
            className={cn(
              'h-full transition-all',
              team2Wins > team1Wins ? 'bg-primary' : 'bg-primary/60'
            )}
            style={{ width: `${100 - team1Pct}%` }}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">{seriesLeader}</p>
      </div>

      {/* Game Record */}
      <div className="grid grid-cols-3 gap-2 py-3 border-t border-border">
        <div className="text-left">
          <span className={cn('text-lg font-semibold', gameWins1 > gameWins2 && 'text-primary')}>
            {gameWins1}
          </span>
        </div>
        <div className="text-center text-sm text-muted-foreground">Game Record</div>
        <div className="text-right">
          <span className={cn('text-lg font-semibold', gameWins2 > gameWins1 && 'text-primary')}>
            {gameWins2}
          </span>
        </div>
      </div>

      {/* Last Played */}
      {lastPlayed && (
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-border text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Last played: {format(new Date(lastPlayed), 'MMM d, yyyy')}</span>
        </div>
      )}
    </div>
  );
};
