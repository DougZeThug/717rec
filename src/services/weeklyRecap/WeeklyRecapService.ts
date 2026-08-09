import { supabase } from '@/integrations/supabase/client';
import { fetchCompletedPlayoffMatchesForSeason } from '@/services/brackets/read/PlayoffSeasonMatchService';
import { warnLog } from '@/utils/logger';

import { fetchHotStreaks } from './streaks';
import type { RecapMode, WeeklyRecapData } from './types';
import { fetchUpsets } from './upsets';

export type { RecapMode, TeamStreakInfo, WeeklyRecapData, WeeklyUpset } from './types';

const emptyRecap = (mode: RecapMode = 'regular'): WeeklyRecapData => ({
  weekNumber: null,
  mode,
  upsets: [],
  hotStreaks: [],
  hasData: false,
});

/**
 * Fetches auto-generated weekly recap data: upsets and hot streaks.
 * Swallows errors and returns empty state on failure to avoid breaking the homepage.
 */
export const WeeklyRecapService = {
  fetchWeeklyRecap: async (): Promise<WeeklyRecapData> => {
    try {
      // 1. Get active season with start_date
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id, start_date')
        .eq('is_active', true)
        .maybeSingle();

      if (!activeSeason) {
        return emptyRecap();
      }

      const seasonId = activeSeason.id;
      const seasonStart = new Date(activeSeason.start_date);

      // 2. Once the season's bracket has produced a result, the recap describes the
      // playoffs rather than a calendar week. This is the only reliable signal:
      // seasons.playoffs_active is cleared by finalize_playoffs and is set on the
      // outgoing season during a partial archive, and a bracket that is mid-run has
      // not reached state 'completed' yet.
      const playoffMatches = await fetchCompletedPlayoffMatchesForSeason(seasonId);
      const mode: RecapMode = playoffMatches.length > 0 ? 'playoffs' : 'regular';

      // 3. Find the most recent match date from completed regular-season matches
      const { data: latestMatchRow } = await supabase
        .from('matches')
        .select('date')
        .eq('season_id', seasonId)
        .eq('iscompleted', true)
        .is('bracket_id', null)
        .not('winner_id', 'is', null)
        .not('date', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestMatchRow?.date) {
        // No completed matches with dates — still fetch hot streaks
        const hotStreaks = await fetchHotStreaks(seasonId);
        return { ...emptyRecap(mode), hotStreaks, hasData: hotStreaks.length > 0 };
      }

      // 4. Calculate week number from season start_date (same logic as useSeasonWeek)
      const latestMatchDate = new Date(latestMatchRow.date);
      const diffMs = latestMatchDate.getTime() - seasonStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

      // 5. Compute the date window for this week
      const weekStartMs = seasonStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;
      const weekStart = new Date(weekStartMs);
      const weekEnd = new Date(weekStartMs + 7 * 24 * 60 * 60 * 1000);

      // 6. Fetch upsets and hot streaks in parallel
      const [upsetsResult, matchHistoryResult] = await Promise.all([
        fetchUpsets(seasonId, weekStart, weekEnd, weekNumber),
        fetchHotStreaks(seasonId),
      ]);

      const hasData = upsetsResult.length > 0 || matchHistoryResult.length > 0;

      return {
        // The week counter keeps advancing off the season start date, so it is
        // meaningless once the regular season is over — suppress it in playoffs mode.
        weekNumber: mode === 'playoffs' ? null : weekNumber,
        mode,
        upsets: upsetsResult,
        hotStreaks: matchHistoryResult,
        hasData,
      };
    } catch (err) {
      warnLog('WeeklyRecapService: failed to fetch weekly recap', err);
      return emptyRecap();
    }
  },
};
