import { Activity, Minus, Users } from 'lucide-react';
import React from 'react';

import { ParityMetrics } from '@/hooks/useLeagueInsights';
import { cn } from '@/lib/utils';

interface LeagueParityCardProps {
  parity: ParityMetrics;
  totalTeams: number;
}

const ParityStat: React.FC<{
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}> = ({ label, value, description, icon: Icon }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
    <div className="flex items-center justify-center rounded-full w-8 h-8 bg-primary/10 shrink-0">
      <Icon size={16} className="text-primary" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold font-mono text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

const LeagueParityCard: React.FC<LeagueParityCardProps> = ({ parity, totalTeams }) => {
  const getParityLabel = (index: number) => {
    if (index >= 80) return 'Very High';
    if (index >= 60) return 'High';
    if (index >= 40) return 'Moderate';
    if (index >= 20) return 'Low';
    return 'Very Low';
  };

  const getParityColor = (index: number) => {
    if (index >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (index >= 60) return 'text-blue-600 dark:text-blue-400';
    if (index >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="border rounded-lg bg-card shadow-sm p-4">
      <h3 className="font-bebas text-lg tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent mb-4">
        League Parity
      </h3>

      {/* Parity Index display */}
      <div className="flex items-center justify-center gap-3 mb-4 py-3 rounded-lg bg-muted/50">
        <span className="text-sm font-medium text-muted-foreground">Parity Index</span>
        <span className={cn('text-3xl font-bold font-mono', getParityColor(parity.parityIndex))}>
          {parity.parityIndex}
        </span>
        <span className={cn('text-sm font-medium', getParityColor(parity.parityIndex))}>
          {getParityLabel(parity.parityIndex)}
        </span>
      </div>

      {/* Parity bar visual */}
      <div className="mb-4">
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${parity.parityIndex}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>Lopsided</span>
          <span>Competitive</span>
        </div>
      </div>

      {/* Detail stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ParityStat
          label="Std Deviation"
          value={parity.standardDeviation}
          description="Power score spread"
          icon={Activity}
        />
        <ParityStat
          label="Top-Bottom Gap"
          value={parity.topBottomGap}
          description="Points between #1 and last"
          icon={Minus}
        />
        <ParityStat
          label="Competitive Teams"
          value={`${parity.competitiveTeams} / ${totalTeams}`}
          description="Within 10pts of average"
          icon={Users}
        />
      </div>
    </div>
  );
};

export default LeagueParityCard;
