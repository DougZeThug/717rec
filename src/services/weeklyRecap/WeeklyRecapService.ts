import { supabase } from '@/integrations/supabase/client';
import { warnLog } from '@/utils/logger';

import { fetchHotStreaks } from './streaks';
import type { WeeklyRecapData } from './types';
import { fetchUpsets } from './upsets';

export type { TeamStreakInfo, WeeklyRecapData, WeeklyUpset } from './types';

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
        return { weekNumber: null, upsets: [], hotStreaks: [], hasData: false };
      }

      const seasonId = activeSeason.id;
      const seasonStart = new Date(activeSeason.start_date);

      // 2. Find the most recent match date from completed regular-season matches
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
        return { weekNumber: null, upsets: [], hotStreaks, hasData: hotStreaks.length > 0 };
      }

      // 3. Calculate week number from season start_date (same logic as useSeasonWeek)
      const latestMatchDate = new Date(latestMatchRow.date);
      const diffMs = latestMatchDate.getTime() - seasonStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

      // 4. Compute the date window for this week
      const weekStartMs = seasonStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;
      const weekStart = new Date(weekStartMs);
      const weekEnd = new Date(weekStartMs + 7 * 24 * 60 * 60 * 1000);

      // 5. Fetch upsets and hot streaks in parallel
      const [upsetsResult, matchHistoryResult] = await Promise.all([
        fetchUpsets(seasonId, weekStart, weekEnd, weekNumber),
        fetchHotStreaks(seasonId),
      ]);

      const hasData = upsetsResult.length > 0 || matchHistoryResult.length > 0;

      return {
        weekNumber,
        upsets: upsetsResult,
        hotStreaks: matchHistoryResult,
        hasData,
      };
    } catch (err) {
      warnLog('WeeklyRecapService: failed to fetch weekly recap', err);
      return { weekNumber: null, upsets: [], hotStreaks: [], hasData: false };
    }
  },
};
