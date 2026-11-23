import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types/timeslots';
import { handleDatabaseError } from '@/utils/errorHandler';

import { TimeslotTransformer } from './TimeslotTransformer';

export const TimeslotQueryService = {
  /**
   * Fetch timeslots for a specific date (Date object)
   */
  async fetchByDate(date: Date): Promise<TeamTimeslot[]> {
    const formattedDate = format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('team_timeslots')
      .select(
        `
        id,
        match_date,
        timeslot,
        team_id,
        created_at,
        is_back_to_back,
        is_double_header,
        pair_slot,
        match_sequence,
        teams:team_id (
          id,
          name,
          logo_url,
          image_url
        )
      `
      )
      .eq('match_date', formattedDate);

    if (error) handleDatabaseError(error, 'Failed to fetch timeslots');
    return TimeslotTransformer.formatTimeslotResponse(data ?? []);
  },

  /**
   * Fetch timeslots for a team within a date range (used by useTimeslotMutation through TimeslotService)
   */
  async fetchWeekTimeslotsByTeam(teamId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('team_timeslots')
      .select(
        'id, match_date, timeslot, team_id, created_at, is_back_to_back, is_double_header, pair_slot, match_sequence'
      )
      .eq('team_id', teamId)
      .gte('match_date', startDate)
      .lte('match_date', endDate)
      .order('match_date', { ascending: true });

    if (error) handleDatabaseError(error, 'Failed to fetch week timeslots by team');
    return data ?? [];
  },

  /**
   * Fetch timeslots for a back-to-back pair (used by teamLoaderUtils.getTeamsByBackToBackPair)
   */
  async fetchTimeslotsForPair(formattedDate: string, primarySlot: string, secondarySlot: string) {
    const { data, error } = await supabase
      .from('team_timeslots')
      .select(
        `
      id,
      team_id,
      timeslot,
      match_date,
      is_back_to_back,
      pair_slot,
      match_sequence,
      teams:team_id (
        id,
        name,
        logo_url,
        image_url,
        players,
        wins,
        losses,
        game_wins,
        game_losses,
        division_id,
        divisions:division_id (
          name,
          display_division
        )
      )
    `
      )
      .eq('match_date', formattedDate)
      .in('timeslot', [primarySlot, secondarySlot])
      .eq('is_back_to_back', true);

    if (error) handleDatabaseError(error, 'Failed to fetch timeslots for pair');
    return data ?? [];
  },

  /**
   * Every night that has at least one posted timeslot, newest first.
   * The schedule page uses this so a night with slots but no matches yet is
   * still a night the page knows about.
   */
  async fetchTimeslotDates(): Promise<string[]> {
    const { data, error } = await supabase
      .from('team_timeslots')
      .select('match_date')
      .order('match_date', { ascending: false });

    if (error) handleDatabaseError(error, 'Failed to fetch timeslot dates');

    const seen = new Set<string>();
    for (const row of data ?? []) {
      if (row.match_date) seen.add(row.match_date);
    }
    return Array.from(seen).sort().reverse();
  },
};
