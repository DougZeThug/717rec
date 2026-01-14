import { format } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { TeamTimeslot, TimeslotOperationResult } from '@/types/timeslots';
import {
  getBackToBackPair,
  getBackToBackPairName,
  getMatchSequence,
  getPairConfig,
} from '@/utils/autoSchedule/constants';
import { errorLog, scheduleLog, warnLog } from '@/utils/logger';

import { TimeslotTransformer } from './TimeslotTransformer';

export class TimeslotService {
  /**
   * Fetch timeslots for a specific date
   */
  static async fetchByDate(date: Date): Promise<TimeslotOperationResult> {
    try {
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

      if (error) {
        errorLog('Error fetching timeslots:', error);
        return {
          success: false,
          error: `Failed to fetch timeslots: ${error.message}`,
        };
      }

      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Unexpected error fetching timeslots:', error);
      return {
        success: false,
        error: `Unexpected error: ${message}`,
      };
    }
  }

  /**
   * Add a back-to-back timeslot assignment
   * Always creates BOTH timeslots for the team
   */
  static async addBackToBackTimeslot(
    date: Date,
    teamId: string,
    pairName: string
  ): Promise<TimeslotOperationResult> {
    try {
      const pairConfig = getPairConfig(pairName);
      if (!pairConfig) {
        return {
          success: false,
          error: `Invalid pair name: ${pairName}`,
        };
      }

      const formattedDate = format(date, 'yyyy-MM-dd');

      // Create both timeslot entries for the back-to-back pair
      const timeslotData = [
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: pairConfig.primary,
          is_back_to_back: true,
          pair_slot: pairConfig.secondary,
          match_sequence: 1,
        },
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: pairConfig.secondary,
          is_back_to_back: true,
          pair_slot: pairConfig.primary,
          match_sequence: 2,
        },
      ];

      scheduleLog(
        `Adding back-to-back timeslots for team ${teamId} in ${pairName} pair:`,
        timeslotData
      );

      const { data, error } = await supabase
        .from('team_timeslots')
        .insert(timeslotData)
        .select('*, teams:team_id(id, name, logo_url, image_url)');

      if (error) {
        errorLog('Error adding back-to-back timeslots:', error);
        return {
          success: false,
          error: `Failed to add back-to-back timeslots: ${error.message}`,
        };
      }

      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error adding back-to-back timeslot:', error);
      return {
        success: false,
        error: `Failed to assign back-to-back timeslot: ${message}`,
      };
    }
  }

  /**
   * Legacy method - redirects to back-to-back assignment
   * @deprecated Use addBackToBackTimeslot instead
   */
  static async addTimeslot(
    date: Date,
    teamId: string,
    timeslot: string
  ): Promise<TimeslotOperationResult> {
    warnLog('addTimeslot is deprecated. Converting to back-to-back assignment.');

    const pairName = getBackToBackPairName(timeslot);
    if (!pairName) {
      return {
        success: false,
        error: `Cannot determine back-to-back pair for timeslot: ${timeslot}`,
      };
    }

    return this.addBackToBackTimeslot(date, teamId, pairName);
  }

  /**
   * Delete a timeslot assignment (removes both slots in back-to-back pair)
   */
  static async deleteTimeslot(id: string): Promise<TimeslotOperationResult> {
    try {
      // First, get the timeslot to find its pair
      const { data: timeslot, error: fetchError } = await supabase
        .from('team_timeslots')
        .select('team_id, match_date, is_back_to_back, pair_slot')
        .eq('id', id)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch timeslot: ${fetchError.message}`,
        };
      }

      if (timeslot.is_back_to_back) {
        // Delete both timeslots in the back-to-back pair
        const { error } = await supabase
          .from('team_timeslots')
          .delete()
          .eq('team_id', timeslot.team_id)
          .eq('match_date', timeslot.match_date)
          .eq('is_back_to_back', true);

        if (error) {
          return {
            success: false,
            error: `Failed to delete back-to-back timeslots: ${error.message}`,
          };
        }
      } else {
        // Legacy single timeslot deletion
        const { error } = await supabase.from('team_timeslots').delete().eq('id', id);

        if (error) {
          return {
            success: false,
            error: `Failed to delete timeslot: ${error.message}`,
          };
        }
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error deleting timeslot:', error);
      return {
        success: false,
        error: `Failed to remove timeslot: ${message}`,
      };
    }
  }

  /**
   * Batch assign multiple teams to the same back-to-back pair
   */
  static async batchAssignBackToBackTimeslots(
    date: Date,
    teamIds: string[],
    pairName: string
  ): Promise<TimeslotOperationResult> {
    try {
      const pairConfig = getPairConfig(pairName);
      if (!pairConfig) {
        return {
          success: false,
          error: `Invalid pair name: ${pairName}`,
        };
      }

      const formattedDate = format(date, 'yyyy-MM-dd');

      // Create timeslot entries for all teams (2 entries per team)
      interface TimeslotInsert {
        match_date: string;
        team_id: string;
        timeslot: string;
        is_back_to_back: boolean;
        pair_slot: string;
        match_sequence: number;
      }

      const allTimeslotData: TimeslotInsert[] = [];

      teamIds.forEach((teamId) => {
        allTimeslotData.push(
          {
            match_date: formattedDate,
            team_id: teamId,
            timeslot: pairConfig.primary,
            is_back_to_back: true,
            pair_slot: pairConfig.secondary,
            match_sequence: 1,
          },
          {
            match_date: formattedDate,
            team_id: teamId,
            timeslot: pairConfig.secondary,
            is_back_to_back: true,
            pair_slot: pairConfig.primary,
            match_sequence: 2,
          }
        );
      });

      scheduleLog(
        `Batch assigning back-to-back timeslots for ${teamIds.length} teams in ${pairName} pair`
      );

      const { data, error } = await supabase
        .from('team_timeslots')
        .insert(allTimeslotData)
        .select('*, teams:team_id(id, name, logo_url, image_url)');

      if (error) {
        errorLog('Batch insert error:', error);
        return {
          success: false,
          error: `Failed to batch assign back-to-back timeslots: ${error.message}`,
        };
      }

      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error in batch back-to-back assignment:', error);
      return {
        success: false,
        error: `Failed to batch assign back-to-back timeslots: ${message}`,
      };
    }
  }

  /**
   * Legacy method - redirects to back-to-back batch assignment
   * @deprecated Use batchAssignBackToBackTimeslots instead
   */
  static async batchAssignTimeslots(
    date: Date,
    teamIds: string[],
    timeslot: string
  ): Promise<TimeslotOperationResult> {
    warnLog('batchAssignTimeslots is deprecated. Converting to back-to-back batch assignment.');

    const pairName = getBackToBackPairName(timeslot);
    if (!pairName) {
      return {
        success: false,
        error: `Cannot determine back-to-back pair for timeslot: ${timeslot}`,
      };
    }

    return this.batchAssignBackToBackTimeslots(date, teamIds, pairName);
  }

  /**
   * Assign a double header to a team (two separate timeslot blocks)
   * Creates two timeslot entries for the team, one for each selected slot
   */
  static async assignDoubleHeader(
    date: Date,
    teamId: string,
    slot1: string,
    slot2: string
  ): Promise<TimeslotOperationResult> {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');

      // Create two separate timeslot entries with is_double_header flag
      const timeslotData = [
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: slot1,
          is_back_to_back: false,
          is_double_header: true,
          pair_slot: null,
          match_sequence: 1,
        },
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: slot2,
          is_back_to_back: false,
          is_double_header: true,
          pair_slot: null,
          match_sequence: 2,
        },
      ];

      scheduleLog(
        `Adding double header timeslots for team ${teamId}: ${slot1} and ${slot2}`,
        timeslotData
      );

      const { data, error } = await supabase
        .from('team_timeslots')
        .insert(timeslotData)
        .select('*, teams:team_id(id, name, logo_url, image_url)');

      if (error) {
        errorLog('Error adding double header timeslots:', error);
        return {
          success: false,
          error: `Failed to add double header timeslots: ${error.message}`,
        };
      }

      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error adding double header timeslot:', error);
      return {
        success: false,
        error: `Failed to assign double header timeslot: ${message}`,
      };
    }
  }

  /**
   * Batch assign double headers to multiple teams
   * Each team gets two timeslot entries for the selected slots
   */
  static async batchAssignDoubleHeaders(
    date: Date,
    teamIds: string[],
    slot1: string,
    slot2: string
  ): Promise<TimeslotOperationResult> {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');

      interface TimeslotInsert {
        match_date: string;
        team_id: string;
        timeslot: string;
        is_back_to_back: boolean;
        is_double_header: boolean;
        pair_slot: string | null;
        match_sequence: number;
      }

      const allTimeslotData: TimeslotInsert[] = [];

      teamIds.forEach((teamId) => {
        allTimeslotData.push(
          {
            match_date: formattedDate,
            team_id: teamId,
            timeslot: slot1,
            is_back_to_back: false,
            is_double_header: true,
            pair_slot: null,
            match_sequence: 1,
          },
          {
            match_date: formattedDate,
            team_id: teamId,
            timeslot: slot2,
            is_back_to_back: false,
            is_double_header: true,
            pair_slot: null,
            match_sequence: 2,
          }
        );
      });

      scheduleLog(
        `Batch assigning double header timeslots for ${teamIds.length} teams: ${slot1} and ${slot2}`
      );

      const { data, error } = await supabase
        .from('team_timeslots')
        .insert(allTimeslotData)
        .select('*, teams:team_id(id, name, logo_url, image_url)');

      if (error) {
        errorLog('Batch double header insert error:', error);
        return {
          success: false,
          error: `Failed to batch assign double header timeslots: ${error.message}`,
        };
      }

      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error in batch double header assignment:', error);
      return {
        success: false,
        error: `Failed to batch assign double header timeslots: ${message}`,
      };
    }
  }
}
