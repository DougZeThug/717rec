import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { calculateStreak } from '@/utils/rankingUtils/calculateStreak';

import { MIN_STREAK_COUNT, type TeamStreakInfo } from './types';

export async function fetchHotStreaks(seasonId: string): Promise<TeamStreakInfo[]> {
  // Get all completed regular-season matches for the season
  const { data: allMatches, error: matchError } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id, winner_id, loser_id, date, iscompleted, round_number')
    .eq('season_id', seasonId)
    .eq('iscompleted', true)
    .is('bracket_id', null)
    .order('date', { ascending: true });

  if (matchError) {
    handleDatabaseError(matchError, 'Failed to fetch matches for streak calculation');
  }

  if (!allMatches || allMatches.length === 0) return [];

  // Map to the shape calculateStreak() expects
  const matchesForStreak = allMatches.map((m) => ({
    id: m.id,
    team1Id: m.team1_id,
    team2Id: m.team2_id,
    winnerId: m.winner_id,
    loserId: m.loser_id,
    date: m.date,
    iscompleted: m.iscompleted,
    roundNumber: m.round_number,
  }));

  // Find unique team IDs
  const teamIds = [...new Set(allMatches.flatMap((m) => [m.team1_id, m.team2_id]))].filter(
    (id): id is string => id !== null
  );

  // Get team details for all participating teams
  const { data: teamDetails, error: teamError } = await supabase
    .from('v_team_details')
    .select('team_id, name, logo_url, image_url, divisionname, division_id')
    .in('team_id', teamIds);

  if (teamError) {
    handleDatabaseError(teamError, 'Failed to fetch team details for streak display');
  }

  if (!teamDetails) return [];

  // Get visible divisions to exclude hidden ones.
  // Must surface: an empty visible-division set silently filters out every hot streak.
  const { data: visibleDivisions, error: visibleDivisionsError } = await supabase
    .from('divisions')
    .select('id')
    .neq('display_division', 'Hidden');

  if (visibleDivisionsError) {
    handleDatabaseError(visibleDivisionsError, 'Failed to fetch visible divisions for hot streaks');
  }

  const visibleDivisionIds = new Set(visibleDivisions?.map((d) => d.id) ?? []);

  const teamMap = new Map(teamDetails.map((t) => [t.team_id, t]));

  const streaks: TeamStreakInfo[] = [];

  for (const teamId of teamIds) {
    const team = teamMap.get(teamId);
    if (!team || !team.division_id || !visibleDivisionIds.has(team.division_id)) continue;

    const streak = calculateStreak(
      teamId,
      matchesForStreak as Parameters<typeof calculateStreak>[1]
    );
    if (!streak) continue;

    // Only show win streaks (W prefix) meeting minimum threshold
    if (!streak.startsWith('W')) continue;

    const streakCount = parseInt(streak.slice(1), 10);
    if (isNaN(streakCount) || streakCount < MIN_STREAK_COUNT) continue;

    streaks.push({
      teamId,
      teamName: team.name ?? '',
      logoUrl: team.image_url ?? team.logo_url ?? undefined,
      division: team.divisionname ?? 'Unknown',
      streak,
      streakCount,
    });
  }

  // Sort by streak length descending, return top 5
  return streaks.sort((a, b) => b.streakCount - a.streakCount).slice(0, 5);
}
