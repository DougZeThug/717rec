import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TeamTimeslot } from "@/types";
import { scheduleLog, errorLog } from "@/utils/logger";

export const useTimeslotOperations = () => {
  const { toast } = useToast();

  // Fetch timeslots for a specific date
  const fetchTimeslotsByDate = async (date: Date | null) => {
    if (!date) {
      return [];
    }
    
    try {
      // Format date as YYYY-MM-DD for database queries
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Use explicit foreign key join for the teams relation
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
            logo_url
          )
        `)
        .eq('match_date', formattedDate);
      
      if (error) {
        throw error;
      }
      
      // Map the data to match the TeamTimeslot type
      const formattedData: TeamTimeslot[] = data?.map(item => ({
        ...item,
        teams: item.teams ? {
          id: item.teams.id,
          name: item.teams.name,
          logo_url: item.teams.logo_url,
          divisionName: null
        } : undefined
      })) || [];
      
      return formattedData;
    } catch (error) {
      errorLog('Error fetching timeslots:', error);
      throw error;
    }
  };

  // Add a new timeslot assignment
  const addTimeslot = async (date: Date, teamId: string, timeslot: string) => {
    try {
      scheduleLog('Adding timeslot:', { date: format(date, 'yyyy-MM-dd'), teamId, timeslot });
      
      const { data, error } = await supabase
        .from('team_timeslots')
        .insert({
          match_date: format(date, 'yyyy-MM-dd'),
          team_id: teamId,
          timeslot
        })
        .select('*, teams:team_id(id, name, logo_url)')
        .single();
      
      if (error) {
        errorLog('Error adding timeslot:', error);
        throw error;
      }
      
      // Format the returned data to match TeamTimeslot type
      const formattedData: TeamTimeslot = {
        ...data,
        teams: data.teams ? {
          id: data.teams.id,
          name: data.teams.name,
          logo_url: data.teams.logo_url,
          divisionName: null
        } : undefined
      };
      
      return formattedData;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error adding timeslot:', error);
      toast({
        title: "Error",
        description: `Failed to assign timeslot: ${message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete a timeslot assignment
  const deleteTimeslot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('team_timeslots')
        .delete()
        .eq('id', id);
      
      if (error) {
        errorLog('Error deleting timeslot:', error);
        throw error;
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error deleting timeslot:', error);
      toast({
        title: "Error",
        description: `Failed to remove timeslot: ${message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Batch assign multiple teams to the same timeslot
  const batchAssignTimeslots = async (date: Date, teamIds: string[], timeslot: string) => {
    try {
      scheduleLog('Batch assigning timeslots:', { 
        date: format(date, 'yyyy-MM-dd'), 
        count: teamIds.length,
        timeslot
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
        .select('*, teams:team_id(id, name, logo_url)');
      
      if (error) {
        errorLog('Batch insert error:', error);
        throw error;
      }
      
      scheduleLog('Batch assignment successful, count:', data?.length);
      
      // Format the returned data to match TeamTimeslot type
      const formattedData: TeamTimeslot[] = data?.map(item => ({
        ...item,
        teams: item.teams ? {
          id: item.teams.id,
          name: item.teams.name,
          logo_url: item.teams.logo_url,
          divisionName: null
        } : undefined
      })) || [];
      
      return formattedData;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error in batch assignment:', error);
      toast({
        title: "Error",
        description: `Failed to batch assign timeslots: ${message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    fetchTimeslotsByDate,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots
  };
};
