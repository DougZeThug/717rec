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
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center font-bold">{record.placement}</div>
                  {getPlacementIcon(record.placement)}
                  <div className="flex items-center gap-2">
                    {(team.image_url || team.logo_url) && (
                      <img
                        src={team.image_url || team.logo_url || undefined}
                        alt={team.name}
                        loading="lazy"
                        decoding="async"
                        className="size-8 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium">{team.name}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {record.wins}-{record.losses} ({record.game_wins}-{record.game_losses} games)
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
