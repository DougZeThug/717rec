import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types/timeslots';
import { handleDatabaseError } from '@/utils/errorHandler';

import { TimeslotTransformer } from './TimeslotTransformer';

export class TimeslotQueryService {
  /**
   * Fetch timeslots for a specific date (Date object)
   */
  static async fetchByDate(date: Date): Promise<TeamTimeslot[]> {
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
  }

  /**
   * Fetch timeslots for a formatted date string (used by useTimeslotsByDate hook)
   */
  static async fetchTimeslotsByDate(formattedDate: string) {
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

    if (error) handleDatabaseError(error, 'Failed to fetch timeslots by date');

    return data ?? [];
  }

  /**
   * Fetch timeslots for a formatted date (used by useTimeslotOperations hook)
   * Note: no image_url in teams select
   */
  static async fetchTimeslotsForDate(formattedDate: string) {
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
          logo_url
        )
      `
      )
      .eq('match_date', formattedDate);

    if (error) handleDatabaseError(error, 'Failed to fetch timeslots for date');
    return data ?? [];
  }

  /**
   * Fetch timeslots for a team within a date range (used by WeekTimeslotDisplay)
   */
  static async fetchWeekTimeslotsByTeam(teamId: string, startDate: string, endDate: string) {
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
  }

  /**
   * Fetch timeslots for a back-to-back pair (used by teamLoaderUtils.getTeamsByBackToBackPair)
   */
  static async fetchTimeslotsForPair(
    formattedDate: string,
    primarySlot: string,
    secondarySlot: string
  ) {
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
  }

  /**
   * Fetch team timeslots for a given date and timeslot (used by autoScheduleUtils)
   */
  static async fetchTeamsByTimeslot(formattedDate: string, timeslot: string) {
    const { data, error } = await supabase
      .from('team_timeslots')
      .select(
        `
        team_id,
        teams:team_id (
          id,
          name,
          logo_url,
          image_url,
          division_id,
          divisionName:divisions(name),
          wins,
          losses,
          game_wins,
          game_losses,
          sos,
          power_score
        )
      `
      )
      .eq('match_date', formattedDate)
      .eq('timeslot', timeslot);

    if (error) handleDatabaseError(error, 'Failed to fetch teams by timeslot');
    return data ?? [];
  }

  /**
   * Fetch timeslot assignments for validation (used by teamLoaderUtils.validateTeamBackToBackAssignment)
   */
  static async fetchTimeslotValidation(
    formattedDate: string,
    teamId: string,
    primarySlot: string,
    secondarySlot: string
  ) {
    const { data, error } = await supabase
      .from('team_timeslots')
      .select('timeslot, match_sequence')
      .eq('match_date', formattedDate)
      .eq('team_id', teamId)
      .eq('is_back_to_back', true)
      .in('timeslot', [primarySlot, secondarySlot]);

    if (error || !data) return null;
    return data;
  }
}
