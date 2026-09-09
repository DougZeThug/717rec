import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Tables } from '@/integrations/supabase/types';
import { TeamPlayersService } from '@/services/liveScoring/TeamPlayersService';

type TeamPlayerRow = Tables<'team_players'>;

/**
 * Both teams' rosters as one lookup by player id.
 *
 * The correction dialogs only ever need "who is this player id", never which
 * team a row came from, so the two queries collapse into one map here rather
 * than in the panel.
 */
export const useMatchRosters = (
  team1Id: string | null,
  team2Id: string | null
): Map<string, TeamPlayerRow> => {
  const team1Roster = useQuery({
    queryKey: ['team-players', team1Id],
    queryFn: () => TeamPlayersService.fetchTeamPlayers(team1Id as string),
    enabled: !!team1Id,
  });
  const team2Roster = useQuery({
    queryKey: ['team-players', team2Id],
    queryFn: () => TeamPlayersService.fetchTeamPlayers(team2Id as string),
    enabled: !!team2Id,
  });

  return useMemo(() => {
    const map = new Map<string, TeamPlayerRow>();
    for (const p of team1Roster.data ?? []) map.set(p.id, p);
    for (const p of team2Roster.data ?? []) map.set(p.id, p);
    return map;
  }, [team1Roster.data, team2Roster.data]);
};
