import { Eye, Radio } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { TeamLogo } from '@/components/ui/team';
import { cn } from '@/lib/utils';

interface MatchScoringHeaderProps {
  team1Name: string;
  team2Name: string;
  team1Logo: string | null;
  team2Logo: string | null;
  gameWins: { team1: number; team2: number };
  canScore: boolean;
  realtimeStatus: string;
}

export const MatchScoringHeader: React.FC<MatchScoringHeaderProps> = ({
  team1Name,
  team2Name,
  team1Logo,
  team2Logo,
  gameWins,
  canScore,
  realtimeStatus,
}) => {
  const isLive = realtimeStatus === 'SUBSCRIBED';

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium',
            isLive ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
          )}
          data-testid="realtime-status"
        >
          <Radio className={cn('size-3.5', isLive && 'animate-pulse')} aria-hidden />
          {isLive ? 'Live' : 'Connecting…'}
        </span>
        {!canScore && (
          <Badge variant="secondary" className="gap-1">
            <Eye className="size-3" aria-hidden /> View only
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <TeamLogo imageUrl={team1Logo} teamName={team1Name} size="md" />
          <span className="max-w-full truncate text-sm font-semibold">{team1Name}</span>
        </div>

        <div className="flex flex-col items-center px-2">
          <span className="font-display text-3xl font-bold tabular-nums" data-testid="game-wins">
            {gameWins.team1}–{gameWins.team2}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Games</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <TeamLogo imageUrl={team2Logo} teamName={team2Name} size="md" />
          <span className="max-w-full truncate text-sm font-semibold">{team2Name}</span>
        </div>
      </div>
    </div>
  );
};
