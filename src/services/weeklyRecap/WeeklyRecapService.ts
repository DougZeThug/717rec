import { supabase } from '@/integrations/supabase/client';
import { fetchCompletedPlayoffMatchesForSeason } from '@/services/brackets/read/PlayoffSeasonMatchService';
import { handleDatabaseError } from '@/utils/errorHandler';
import { warnLog } from '@/utils/logger';

import { fetchHotStreaks } from './streaks';
import type { RecapMode, WeeklyRecapData } from './types';
import { fetchUpsets } from './upsets';
import { deriveWeekNumber, getWeekWindow } from './weekWindow';

export type { RecapMode, TeamStreakInfo, WeeklyRecapData, WeeklyUpset } from './types';

type PlayoffMatches = Awaited<ReturnType<typeof fetchCompletedPlayoffMatchesForSeason>>;

export interface WeeklyRecapRequest {
  seasonId: string;
  /** Counting from 1. See ./weekWindow for how a week is defined. */
  weekNumber: number;
  /**
   * seasons.start_date, when the caller already has it. Supplying it saves a
   * query — resolveCurrentWeek always does.
   */
  seasonStartDate?: string;
}

export interface CurrentWeekResolution {
  seasonId: string;
  seasonStartDate: string;
  /** null when the season has no completed regular-season match, or in playoffs. */
  weekNumber: number | null;
  mode: RecapMode;
  /** Already fetched during resolution; passed on so nobody re-queries. */
  playoffMatches: PlayoffMatches;
}

const emptyRecap = (mode: RecapMode = 'regular'): WeeklyRecapData => ({
  weekNumber: null,
  mode,
  upsets: [],
  hotStreaks: [],
  hasData: false,
});

const fetchActiveSeasonForRecap = async (): Promise<{
  id: string;
  start_date: string;
} | null> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, start_date')
    .eq('is_active', true)
    .maybeSingle();

  if (error) handleDatabaseError(error, 'Failed to fetch the active season for the recap');
  return data ?? null;
};

/**
 * The recap for the whole playoff bracket. Playoff games carry no date, so there
 * is no week to window on.
 */
const fetchPlayoffRecap = async (
  seasonId: string,
  playoffMatches: PlayoffMatches
): Promise<WeeklyRecapData> => {
  const [upsets, hotStreaks] = await Promise.all([
    fetchUpsets(seasonId, { mode: 'playoffs', matches: playoffMatches }),
    fetchHotStreaks(seasonId, playoffMatches),
  ]);

  return {
    weekNumber: null,
    mode: 'playoffs',
    upsets,
    hotStreaks,
    hasData: upsets.length > 0 || hotStreaks.length > 0,
  };
};

export const WeeklyRecapService = {
  /**
   * Which week the active season is currently on, and whether the recap should
   * describe a calendar week or the playoff bracket.
   *
   * Throws. Callers that must not break on failure use fetchWeeklyRecap.
   */
  resolveCurrentWeek: async (): Promise<CurrentWeekResolution | null> => {
    const activeSeason = await fetchActiveSeasonForRecap();
    if (!activeSeason) return null;

    // Once the season's bracket has produced a result, the recap describes the
    // playoffs rather than a calendar week. This is the only reliable signal:
    // seasons.playoffs_active is cleared by finalize_playoffs and is set on the
    // outgoing season during a partial archive, and a bracket that is mid-run has
    // not reached state 'completed' yet.
    const playoffMatches = await fetchCompletedPlayoffMatchesForSeason(activeSeason.id);

    if (playoffMatches.length > 0) {
      return {
        seasonId: activeSeason.id,
        seasonStartDate: activeSeason.start_date,
        weekNumber: null,
        mode: 'playoffs',
        playoffMatches,
      };
    }

    const { data: latestMatchRow, error } = await supabase
      .from('matches')
      .select('date')
      .eq('season_id', activeSeason.id)
      .eq('iscompleted', true)
      .is('bracket_id', null)
      .not('winner_id', 'is', null)
      .not('date', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to find the latest completed match');

    return {
      seasonId: activeSeason.id,
      seasonStartDate: activeSeason.start_date,
      weekNumber: latestMatchRow?.date
        ? deriveWeekNumber(activeSeason.start_date, new Date(latestMatchRow.date))
        : null,
      mode: 'regular',
      playoffMatches,
    };
  },

  /**
   * The recap for one explicit season week.
   *
   * THROWS on any failure. An admin building a publishable edition must see the
   * error — a swallowed one looks exactly like a quiet week, and would be
   * published as fact.
   */
  fetchRecapForWeek: async ({
    seasonId,
    weekNumber,
    seasonStartDate,
  }: WeeklyRecapRequest): Promise<WeeklyRecapData> => {
    let startDate = seasonStartDate;

    if (startDate === undefined) {
      const { data: season, error } = await supabase
        .from('seasons')
        .select('id, start_date')
        .eq('id', seasonId)
        .maybeSingle();

      if (error) handleDatabaseError(error, 'Failed to fetch the season for the recap');
      if (!season) return emptyRecap();
      startDate = season.start_date;
    }

    const { weekStart, weekEnd } = getWeekWindow(startDate, weekNumber);

    // Streaks run season-to-date rather than week-only, but they stop at the end
    // of the week being recapped. Without that bound, an edition of week 3 built
    // in week 8 would report week 8 streaks under a week 3 headline.
    const [upsets, hotStreaks] = await Promise.all([
      fetchUpsets(seasonId, { mode: 'regular', weekStart, weekEnd, weekNumber }),
      fetchHotStreaks(seasonId, [], weekEnd),
    ]);

    return {
      weekNumber,
      mode: 'regular',
      upsets,
      hotStreaks,
      hasData: upsets.length > 0 || hotStreaks.length > 0,
    };
  },

  /**
   * The recap for wherever the active season currently is.
   *
   * Swallows errors and returns an empty recap so a failure degrades to a
   * missing home-page card rather than a broken page. That is right for the home
   * page and wrong everywhere else — new callers should use fetchRecapForWeek,
   * which throws.
   */
  fetchWeeklyRecap: async (): Promise<WeeklyRecapData> => {
    try {
      const current = await WeeklyRecapService.resolveCurrentWeek();
      if (!current) return emptyRecap();

      if (current.mode === 'playoffs') {
        return await fetchPlayoffRecap(current.seasonId, current.playoffMatches);
      }

      if (current.weekNumber === null) {
        // No completed matches with dates — still report hot streaks.
        const hotStreaks = await fetchHotStreaks(current.seasonId, current.playoffMatches);
        return { ...emptyRecap(), hotStreaks, hasData: hotStreaks.length > 0 };
      }

      return await WeeklyRecapService.fetchRecapForWeek({
        seasonId: current.seasonId,
        seasonStartDate: current.seasonStartDate,
        weekNumber: current.weekNumber,
      });
    } catch (err) {
      warnLog('WeeklyRecapService: failed to fetch weekly recap', err);
      return emptyRecap();
    }
  },
};
