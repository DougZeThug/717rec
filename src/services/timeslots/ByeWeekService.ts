import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types/timeslots';
import { handleDatabaseError } from '@/utils/errorHandler';

import { TimeslotTransformer } from './TimeslotTransformer';

export class ByeWeekService {
  /**
   * Assign bye week to a single team
   * @throws {DatabaseError} When database operations fail
   */
  static async assignByeWeek(date: Date, teamId: string): Promise<TeamTimeslot> {
    const formattedDate = format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('team_timeslots')
      .insert({
        match_date: formattedDate,
        team_id: teamId,
        timeslot: 'BYE',
        is_back_to_back: false,
        is_double_header: false,
        pair_slot: null,
        match_sequence: null,
      })
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
      .single();

    if (error) {
      handleDatabaseError(error, 'Failed to assign bye week');
    }

    return TimeslotTransformer.formatSingleTimeslot(data);
  }

  /**
   * Batch assign bye weeks to multiple teams
   * @throws {DatabaseError} When database operations fail
   */
  static async batchAssignByeWeeks(date: Date, teamIds: string[]): Promise<TeamTimeslot[]> {
    const formattedDate = format(date, 'yyyy-MM-dd');

    const insertData = teamIds.map((teamId) => ({
      match_date: formattedDate,
      team_id: teamId,
      timeslot: 'BYE',
      is_back_to_back: false,
      is_double_header: false,
      pair_slot: null,
      match_sequence: null,
    }));

    const { data, error } = await supabase.from('team_timeslots').insert(insertData).select(`
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
      `);

    if (error) {
      handleDatabaseError(error, 'Failed to batch assign bye weeks');
    }

    return TimeslotTransformer.formatTimeslotResponse(data);
  }

  /**
   * Remove bye week assignment
   * @throws {DatabaseError} When database operations fail
   */
  static async removeByeWeek(timeslotId: string): Promise<void> {
    const { error } = await supabase
      .from('team_timeslots')
      .delete()
      .eq('id', timeslotId)
      .eq('timeslot', 'BYE');

    if (error) {
      handleDatabaseError(error, 'Failed to remove bye week');
    }
  }
}
