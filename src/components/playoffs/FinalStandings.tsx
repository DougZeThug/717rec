import { useQuery } from '@tanstack/react-query';
import { Award, Medal, Trophy } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { fetchFinalStandings } from '@/services/brackets/BracketReadService';
import { log } from '@/utils/logger';

import FinalStandingsSkeleton from './FinalStandingsSkeleton';
interface FinalStandingsProps {
  bracketId: string;
  show?: boolean;
}

const getPlacementIcon = (placement: number) => {
  if (placement === 1)
    return (
      <SeasonalIcon
        defaultIcon={Trophy}
        winterGlyph="frozen-trophy"
        size={20}
        className="text-yellow-500"
      />
    );
  if (placement === 2)
    return (
      <SeasonalIcon
        defaultIcon={Medal}
        winterGlyph="frozen-trophy"
        size={20}
        className="text-muted-foreground"
      />
    );
  if (placement === 3)
    return (
      <SeasonalIcon
        defaultIcon={Award}
        winterGlyph="frozen-trophy"
        size={20}
        className="text-amber-600"
      />
    );
  return null;
};

export function FinalStandings({ bracketId, show = true }: FinalStandingsProps) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    log(`🏆 FinalStandings render #${renderCount.current}`, { bracketId, show });
  });

  // Track component lifecycle
  useEffect(() => {
    log('✅ FinalStandings MOUNTED', { bracketId });
    return () => {
      log('❌ FinalStandings UNMOUNTED', { bracketId });
    };
  }, [bracketId]);

  const { data: standings, isLoading } = useQuery({
    queryKey: ['final-standings', bracketId],
    queryFn: () => fetchFinalStandings(bracketId),
    enabled: show && !!bracketId,
  });

  if (!show) return null;
  if (isLoading) return <FinalStandingsSkeleton />;
  if (!standings || standings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SeasonalIcon defaultIcon={Trophy} winterGlyph="frozen-trophy" size={20} />
          Final Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {standings.map((record) => {
            const team = record.teams;
            if (!team) return null;
            return (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent"
              >
                <div className="w-6 shrink-0 text-center font-bold tabular-nums">
                  {record.placement}
                </div>
                <div className="shrink-0">{getPlacementIcon(record.placement)}</div>
                {(team.image_url || team.logo_url) && (
                  <img
                    src={team.image_url || team.logo_url || undefined}
                    alt={team.name}
                    loading="lazy"
                    decoding="async"
                    className="size-9 shrink-0 rounded-md object-cover"
                  />
                )}
                <span className="min-w-0 flex-1 font-medium leading-snug break-words">
                  {team.name}
                </span>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold tabular-nums leading-none">
                    {record.wins ?? 0}-{record.losses ?? 0}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {record.game_wins ?? 0}-{record.game_losses ?? 0} games
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
