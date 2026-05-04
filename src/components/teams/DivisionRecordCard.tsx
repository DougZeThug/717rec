import { Shield, Star, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';

interface DivisionRecordCardProps {
  tier: 'competitive' | 'intermediate' | 'recreational';
  record: { wins: number; losses: number; gameWins: number; gameLosses: number };
}

export const DivisionRecordCard = ({ tier, record }: DivisionRecordCardProps) => {
  const icons = {
    competitive: <Shield size={14} className="text-red-500" />,
    intermediate: <Users size={14} className="text-blue-500" />,
    recreational: <Star size={14} className="text-green-500" />,
  };

  const labels = {
    competitive: 'vs Competitive',
    intermediate: 'vs Intermediate',
    recreational: 'vs Recreational',
  };

  const total = record.wins + record.losses;
  const winPct = total > 0 ? (record.wins / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50">
      {icons[tier]}
      <div>
        <div className="text-xs text-muted-foreground">{labels[tier]}</div>
        <div className="font-mono text-sm font-medium">
          {record.wins}-{record.losses}
          <span className={cn('ml-2 text-xs', getWinPercentageColor(winPct / 100))}>
            ({winPct.toFixed(0)}%)
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Games: {record.gameWins}-{record.gameLosses}
        </div>
      </div>
    </div>
  );
};
