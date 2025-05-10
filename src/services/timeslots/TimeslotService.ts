
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TeamTimeslot, TimeslotOperationResult } from "@/types/timeslots";
import { TimeslotTransformer } from "./TimeslotTransformer";

export class TimeslotService {
  /**
   * Fetch timeslots for a specific date
   */
  static async fetchByDate(date: Date): Promise<TimeslotOperationResult> {
    try {
      // Format date as YYYY-MM-DD for database queries
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('team_timeslots')
        .select(`
          id,
          match_date,
          timeslot,
          team_id,
          created_at,
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
      
      // Map the data using the transformer
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
   * Add a new timeslot assignment
   */
  static async addTimeslot(date: Date, teamId: string, timeslot: string): Promise<TimeslotOperationResult> {
    try {
      console.log('Adding timeslot:', { date: format(date, 'yyyy-MM-dd'), teamId, timeslot });
      
      const { data, error } = await supabase
        .from('team_timeslots')
        .insert({
          match_date: format(date, 'yyyy-MM-dd'),
          team_id: teamId,
          timeslot
        })
        .select('*, teams:team_id(id, name, logo_url, image_url)')
        .single();
      
      if (error) {
        console.error('Error details:', error);
        return { 
          success: false, 
          error: `Failed to add timeslot: ${error.message}` 
        };
      }
      
      // Format the returned data
      const formattedData = TimeslotTransformer.formatSingleTimeslot(data);
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error: any) {
      console.error('Error adding timeslot:', error);
      return { 
        success: false, 
        error: `Failed to assign timeslot: ${error.message || 'Unknown error'}` 
      };
    }
  }

  /**
   * Delete a timeslot assignment
   */
  static async deleteTimeslot(id: string): Promise<TimeslotOperationResult> {
    try {
      const { error } = await supabase
        .from('team_timeslots')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error details:', error);
        return { 
          success: false, 
          error: `Failed to delete timeslot: ${error.message}` 
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error deleting timeslot:', error);
      return { 
        success: false, 
        error: `Failed to remove timeslot: ${error.message || 'Unknown error'}` 
      };
    }
  }

  /**
   * Batch assign multiple teams to the same timeslot
   */
  static async batchAssignTimeslots(date: Date, teamIds: string[], timeslot: string): Promise<TimeslotOperationResult> {
    try {
      console.log('Batch assigning timeslots:', { 
        date: format(date, 'yyyy-MM-dd'), 
        teamIds, 
        timeslot,
        count: teamIds.length 
      });
      
      // Create an array of objects for batch insert
      const insertData = teamIds.map(teamId => ({
        match_date: format(date, 'yyyy-MM-dd'),
        team_id: teamId,
        timeslot
      }));
      
      // Use a single batch insert instead of multiple calls
      const { data, error } = await supabase
        .from('team_timeslots')
        .insert(insertData)
        .select('*, teams:team_id(id, name, logo_url, image_url)');
      
      if (error) {
        console.error('Batch insert error details:', error);
        return { 
          success: false, 
          error: `Failed to batch assign timeslots: ${error.message}` 
        };
      }
      
      console.log('Batch assignment successful:', data);
      
      // Format the returned data
      const formattedData = TimeslotTransformer.formatTimeslotResponse(data);
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error: any) {
      console.error('Error in batch assignment:', error);
      return { 
        success: false, 
        error: `Failed to batch assign timeslots: ${error.message || 'Unknown error'}` 
      };
    }
  }
}
