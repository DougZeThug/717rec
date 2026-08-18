import { supabase } from '@/integrations/supabase/client';
import { fetchCompletedPlayoffMatchesForSeason } from '@/services/brackets/read/PlayoffSeasonMatchService';
import { warnLog } from '@/utils/logger';
import { getLeagueCalendarDate, getLeagueMidnightUtc } from '@/utils/timezone';

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
      // start_date is a calendar date (YYYY-MM-DD) in league time.
      const [seasonYear, seasonMonth, seasonDay] = activeSeason.start_date
        .split('-')
        .map(Number);

      // 2. Once the season's bracket has produced a result, the recap describes the
      // playoffs rather than a calendar week. This is the only reliable signal:
      // seasons.playoffs_active is cleared by finalize_playoffs and is set on the
      // outgoing season during a partial archive, and a bracket that is mid-run has
      // not reached state 'completed' yet.
      const playoffMatches = await fetchCompletedPlayoffMatchesForSeason(seasonId);
      const mode: RecapMode = playoffMatches.length > 0 ? 'playoffs' : 'regular';

      if (mode === 'playoffs') {
        // Playoff games carry no date, so there is no week to window on — the whole
        // bracket is the recap.
        const [upsets, hotStreaks] = await Promise.all([
          fetchUpsets(seasonId, { mode: 'playoffs', matches: playoffMatches }),
          fetchHotStreaks(seasonId, playoffMatches),
        ]);

        return {
          weekNumber: null,
          mode,
          upsets,
          hotStreaks,
          hasData: upsets.length > 0 || hotStreaks.length > 0,
        };
      }

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
        const hotStreaks = await fetchHotStreaks(seasonId, playoffMatches);
        return { ...emptyRecap(mode), hotStreaks, hasData: hotStreaks.length > 0 };
      }

      // 4. Calculate the week number using league-time (EST/EDT) calendar days.
      // Evening matches are stored as next-day UTC, so raw UTC arithmetic would
      // push them into the following week and drop earlier same-day matches.
      const latest = getLeagueCalendarDate(new Date(latestMatchRow.date));
      const diffDays = Math.floor(
        (Date.UTC(latest.year, latest.month - 1, latest.day) -
          Date.UTC(seasonYear, seasonMonth - 1, seasonDay)) /
          (1000 * 60 * 60 * 24)
      );
      const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

      // 5. Compute the date window for this week as UTC instants of league midnight
      const weekStart = getLeagueMidnightUtc(
        seasonYear,
        seasonMonth,
        seasonDay + (weekNumber - 1) * 7
      );
      const weekEnd = getLeagueMidnightUtc(seasonYear, seasonMonth, seasonDay + weekNumber * 7);

      // 6. Fetch upsets and hot streaks in parallel
      const [upsetsResult, matchHistoryResult] = await Promise.all([
        fetchUpsets(seasonId, { mode: 'regular', weekStart, weekEnd, weekNumber }),
        fetchHotStreaks(seasonId, playoffMatches),
      ]);

      const hasData = upsetsResult.length > 0 || matchHistoryResult.length > 0;

      return {
        weekNumber,
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
