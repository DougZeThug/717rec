
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TeamTimeslot, TimeslotOperationResult } from "@/types/timeslots";
import { TimeslotTransformer } from "./TimeslotTransformer";
import { getBackToBackPair, getMatchSequence, getBackToBackPairName, getPairConfig } from "@/utils/autoSchedule/constants";

export class TimeslotService {
  /**
   * Fetch timeslots for a specific date
   */
  static async fetchByDate(date: Date): Promise<TimeslotOperationResult> {
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('team_timeslots')
        .select(`
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
        `)
        .eq('match_date', formattedDate);
      
      if (error) {
        console.error('Error fetching timeslots:', error);
        return { 
          success: false, 
          error: `Failed to fetch timeslots: ${error.message}` 
        };
      }
      
      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error: any) {
      console.error('Unexpected error fetching timeslots:', error);
      return { 
        success: false, 
        error: `Unexpected error: ${error.message || 'Unknown error'}` 
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
          error: `Invalid pair name: ${pairName}`
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
          match_sequence: 1
        },
        {
          match_date: formattedDate,
          team_id: teamId,
          timeslot: pairConfig.secondary,
          is_back_to_back: true,
          pair_slot: pairConfig.primary,
          match_sequence: 2
        }
      ];
      
      console.log(`Adding back-to-back timeslots for team ${teamId} in ${pairName} pair:`, timeslotData);
      
      const { data, error } = await supabase
        .from('team_timeslots')
        .insert(timeslotData)
        .select('*, teams:team_id(id, name, logo_url, image_url)');
      
      if (error) {
        console.error('Error adding back-to-back timeslots:', error);
        return { 
          success: false, 
          error: `Failed to add back-to-back timeslots: ${error.message}` 
        };
      }
      
      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error: any) {
      console.error('Error adding back-to-back timeslot:', error);
      return { 
        success: false, 
        error: `Failed to assign back-to-back timeslot: ${error.message || 'Unknown error'}` 
      };
    }
  }

  /**
   * Legacy method - redirects to back-to-back assignment
   * @deprecated Use addBackToBackTimeslot instead
   */
  static async addTimeslot(date: Date, teamId: string, timeslot: string): Promise<TimeslotOperationResult> {
    console.warn('⚠️ addTimeslot is deprecated. Converting to back-to-back assignment.');
    
    const pairName = getBackToBackPairName(timeslot);
    if (!pairName) {
      return {
        success: false,
        error: `Cannot determine back-to-back pair for timeslot: ${timeslot}`
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
          error: `Failed to fetch timeslot: ${fetchError.message}` 
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
            error: `Failed to delete back-to-back timeslots: ${error.message}` 
          };
        }
      } else {
        // Legacy single timeslot deletion
        const { error } = await supabase
          .from('team_timeslots')
          .delete()
          .eq('id', id);
        
        if (error) {
          return { 
            success: false, 
            error: `Failed to delete timeslot: ${error.message}` 
          };
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting timeslot:', error);
      return { 
        success: false, 
        error: `Failed to remove timeslot: ${error.message || 'Unknown error'}` 
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
          error: `Invalid pair name: ${pairName}`
        };
      }
      
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Create timeslot entries for all teams (2 entries per team)
      const allTimeslotData: any[] = [];
      
      teamIds.forEach(teamId => {
        allTimeslotData.push(
          {
            match_date: formattedDate,
            team_id: teamId,
            timeslot: pairConfig.primary,
            is_back_to_back: true,
            pair_slot: pairConfig.secondary,
            match_sequence: 1
          },
          {
            match_date: formattedDate,
            team_id: teamId,
            timeslot: pairConfig.secondary,
            is_back_to_back: true,
            pair_slot: pairConfig.primary,
            match_sequence: 2
          }
        );
      });
      
      console.log(`Batch assigning back-to-back timeslots for ${teamIds.length} teams in ${pairName} pair`);
      
      const { data, error } = await supabase
        .from('team_timeslots')
        .insert(allTimeslotData)
        .select('*, teams:team_id(id, name, logo_url, image_url)');
      
      if (error) {
        console.error('Batch insert error:', error);
        return { 
          success: false, 
          error: `Failed to batch assign back-to-back timeslots: ${error.message}` 
        };
      }
      
      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error: any) {
      console.error('Error in batch back-to-back assignment:', error);
      return { 
        success: false, 
        error: `Failed to batch assign back-to-back timeslots: ${error.message || 'Unknown error'}` 
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
    console.warn('⚠️ batchAssignTimeslots is deprecated. Converting to back-to-back batch assignment.');
    
    const pairName = getBackToBackPairName(timeslot);
    if (!pairName) {
      return {
        success: false,
        error: `Cannot determine back-to-back pair for timeslot: ${timeslot}`
      };
    }
    
    return this.batchAssignBackToBackTimeslots(date, teamIds, pairName);
  }
}
