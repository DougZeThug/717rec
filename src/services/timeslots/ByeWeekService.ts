import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot } from '@/types/timeslots';
import { errorLog } from '@/utils/logger';

export class ByeWeekService {
  /**
   * Assign bye week to a single team
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
      errorLog('Error assigning bye week:', error);
      throw new Error(`Failed to assign bye week: ${error.message}`);
    }

    return {
      ...data,
      teams: data.teams
        ? {
            id: data.teams.id,
            name: data.teams.name,
            logo_url: data.teams.logo_url,
            image_url: data.teams.image_url,
            divisionName: null,
          }
        : undefined,
    };
  }

  /**
   * Batch assign bye weeks to multiple teams
   */
  static async batchAssignByeWeeks(date: Date, teamIds: string[]): Promise<TeamTimeslot[]> {
    const formattedDate = format(date, 'yyyy-MM-dd');

    const insertData = teamIds.map((teamId) => ({
      match_date: formattedDate,
      team_id: teamId,
      timeslot: 'BYE',
      is_back_to_back: false,
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
      errorLog('Error batch assigning bye weeks:', error);
      throw new Error(`Failed to batch assign bye weeks: ${error.message}`);
    }

    return data.map((item) => ({
      ...item,
      teams: item.teams
        ? {
            id: item.teams.id,
            name: item.teams.name,
            logo_url: item.teams.logo_url,
            image_url: item.teams.image_url,
            divisionName: null,
          }
        : undefined,
    }));
  }

  /**
   * Remove bye week assignment
   */
  static async removeByeWeek(timeslotId: string): Promise<void> {
    const { error } = await supabase
      .from('team_timeslots')
      .delete()
      .eq('id', timeslotId)
      .eq('timeslot', 'BYE');

    if (error) {
      errorLog('Error removing bye week:', error);
      throw new Error(`Failed to remove bye week: ${error.message}`);
    }
  }
}
