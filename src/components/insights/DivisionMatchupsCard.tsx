import { Swords } from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type DivisionMatchupRecord,
  type DivisionTier,
  useLeagueDivisionMatchups,
} from '@/hooks/useLeagueDivisionMatchups';
import { cn } from '@/lib/utils';

const TIER_LABEL: Record<DivisionTier, string> = {
  competitive: 'Competitive',
  intermediate: 'Intermediate',
  recreational: 'Recreational',
};

const TIER_TEXT: Record<DivisionTier, string> = {
  competitive: 'text-[hsl(var(--competitive))]',
  intermediate: 'text-[hsl(var(--intermediate))]',
  recreational: 'text-[hsl(var(--recreational))]',
};

const MatchupRow: React.FC<{ row: DivisionMatchupRecord }> = ({ row }) => {
  const total = row.winsA + row.winsB;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-b-0">
      <div className="flex items-center gap-2 text-sm font-medium min-w-0">
        <span className={cn('truncate', TIER_TEXT[row.tierA])}>{TIER_LABEL[row.tierA]}</span>
        <span className="text-muted-foreground text-xs">vs</span>
        <span className={cn('truncate', TIER_TEXT[row.tierB])}>{TIER_LABEL[row.tierB]}</span>
      </div>
      <div className="flex items-center gap-2 tabular-nums text-sm font-semibold">
        <span className={TIER_TEXT[row.tierA]}>{row.winsA}</span>
        <span className="text-muted-foreground">–</span>
        <span className={TIER_TEXT[row.tierB]}>{row.winsB}</span>
        {total === 0 && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">no matches</span>
        )}
      </div>
    </div>
  );
};

const DivisionMatchupsCard: React.FC = () => {
  const { data, isLoading } = useLeagueDivisionMatchups();

  return (
    <Card className="bg-card text-card-foreground border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Swords size={16} className="text-amber-500" />
          Division Matchups
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Combined head-to-head records between divisions, using each team's display division at the
          time of the match.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="space-y-2">
            {['dm-skel-1', 'dm-skel-2', 'dm-skel-3', 'dm-skel-4', 'dm-skel-5', 'dm-skel-6'].map(
              (key) => (
                <Skeleton key={key} className="h-8 w-full" />
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {data.map((row) => (
              <MatchupRow key={`${row.tierA}-${row.tierB}`} row={row} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DivisionMatchupsCard;
