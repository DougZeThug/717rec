import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEffect, useRef } from 'react';
import { log } from '@/utils/logger';

interface FinalStandingsProps {
  bracketId: string;
  show?: boolean;
}

export function FinalStandings({ bracketId, show = true }: FinalStandingsProps) {
  const renderCount = useRef(0);
  
  renderCount.current++;
  log(`🏆 FinalStandings render #${renderCount.current}`, { bracketId, show });
  
  // Track component lifecycle
  useEffect(() => {
    log('✅ FinalStandings MOUNTED', { bracketId });
    return () => {
      log('❌ FinalStandings UNMOUNTED', { bracketId });
    };
  }, [bracketId]);
  
  const { data: standings, isLoading } = useQuery({
    queryKey: ['final-standings', bracketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playoff_team_records')
        .select(`
          placement,
          wins,
          losses,
          game_wins,
          game_losses,
          teams:team_id (
            id,
            name,
            logo_url
          )
        `)
        .eq('bracket_id', bracketId)
        .not('placement', 'is', null)
        .order('placement', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: show && !!bracketId
  });

  if (!show) return null;
  if (isLoading) return <div>Loading standings...</div>;
  if (!standings || standings.length === 0) return null;

  const getPlacementIcon = (placement: number) => {
    if (placement === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (placement === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (placement === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Final Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {standings.map((record: any) => (
            <div
              key={record.teams.id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 text-center font-bold">
                  {record.placement}
                </div>
                {getPlacementIcon(record.placement)}
                <div className="flex items-center gap-2">
                  {record.teams.logo_url && (
                    <img
                      src={record.teams.logo_url}
                      alt={record.teams.name}
                      loading="lazy"
                      decoding="async"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="font-medium">{record.teams.name}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {record.wins}-{record.losses} ({record.game_wins}-{record.game_losses} games)
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
