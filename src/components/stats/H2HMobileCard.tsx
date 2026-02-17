import { format } from 'date-fns';
import { Trophy, X } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { TeamLogo } from '@/components/ui/team/TeamLogo';
import { cn } from '@/lib/utils';
import type { HeadToHeadRecord } from '@/types/headToHead';
import { getRivalryType, type RivalryType } from '@/utils/teamDetailsUtils/rivalryUtils';

interface H2HMobileCardProps {
  record: HeadToHeadRecord;
  onCardClick: (opponentId: string, opponentName: string) => void;
}

const rivalryBorderColors: Record<RivalryType, string> = {
  rival: 'border-l-amber-500',
  dominated: 'border-l-emerald-500',
  nemesis: 'border-l-red-500',
};

const rivalryBadgeConfig: Record<RivalryType, { label: string; className: string }> = {
  rival: {
    label: 'Rival',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  dominated: {
    label: 'Dominated',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  nemesis: {
    label: 'Nemesis',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  },
};

const H2HMobileCard: React.FC<H2HMobileCardProps> = ({ record, onCardClick }) => {
  const rivalryType = getRivalryType(record);
  const badge = rivalryType ? rivalryBadgeConfig[rivalryType] : null;
  const borderAccent = rivalryType ? rivalryBorderColors[rivalryType] : '';

  return (
    <button
      onClick={() => record.opponent_id && onCardClick(record.opponent_id, record.opponent_name)}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-l-4 transition-colors text-left w-full',
        'hover:bg-muted/50',
        borderAccent || 'border-l-border'
      )}
    >
      <TeamLogo
        imageUrl={record.opponent_image_url || ''}
        teamName={record.opponent_name}
        teamId={record.opponent_id}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        {/* Row 1: Name + rivalry badge */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{record.opponent_name}</span>
          {badge && (
            <span
              className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap flex-shrink-0',
                badge.className
              )}
            >
              {badge.label}
            </span>
          )}
        </div>
        {/* Row 2: W-L and Win% */}
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1 text-xs">
            <Trophy className="w-3 h-3 text-emerald-500" />
            <span className="text-emerald-600 font-medium">{record.wins}W</span>
            <span className="text-muted-foreground">-</span>
            <X className="w-3 h-3 text-rose-500" />
            <span className="text-rose-600 font-medium">{record.losses}L</span>
          </div>
          <Badge
            variant={record.win_pct >= 50 ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0"
          >
            {Number(record.win_pct).toFixed(1)}%
          </Badge>
        </div>
        {/* Row 3: Game W-L and last played */}
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Games: {record.game_wins}-{record.game_losses}
          {record.last_played_at && (
            <>
              {' · Last: '}
              {format(new Date(record.last_played_at), 'MMM d, yyyy')}
            </>
          )}
        </div>
      </div>
    </button>
  );
};

export default React.memo(H2HMobileCard);
