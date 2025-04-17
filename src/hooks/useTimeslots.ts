
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TeamTimeslot } from "@/types";

export const useTimeslots = (date: Date) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Format date as YYYY-MM-DD for database queries
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Fetch timeslots for the selected date
  useEffect(() => {
    const fetchTimeslots = async () => {
      setIsLoading(true);
      
      try {
        // Query written in explicit format with all fields specified
        const { data, error } = await supabase
          .from('team_timeslots')
          .select(`
            id,
            match_date,
            timeslot,
            team_id,
            created_at,
            teams (
              id, 
              name, 
              logo_url, 
              division_id
            )
          `)
          .eq('match_date', formattedDate);
        
        if (error) {
          throw error;
        }
        
        console.log('Raw data from Supabase in useTimeslots:', data);
        
        // Debug: Log logo URLs specifically
        data?.forEach((item, index) => {
          console.log(`Team ${index} logo_url in useTimeslots:`, item.teams?.logo_url);
        });
        
        // Map the data to match the TeamTimeslot type
        const formattedData: TeamTimeslot[] = data?.map(item => ({
          ...item,
          teams: item.teams ? {
            id: item.teams.id,
            name: item.teams.name,
            logo_url: item.teams.logo_url,
            divisionName: null // We'll add this if needed in the future
          } : undefined
        })) || [];
        
        console.log('Formatted timeslots data in useTimeslots:', formattedData);
        setTimeslots(formattedData);
      } catch (error: any) {
        console.error('Error fetching timeslots:', error);
        toast({
          title: "Error",
          description: "Failed to load timeslots. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimeslots();
  }, [date, formattedDate, toast]);

  // Add a new timeslot assignment
  const addTimeslot = async (date: Date, teamId: string, timeslot: string) => {
    try {
      console.log('Adding timeslot:', { date: format(date, 'yyyy-MM-dd'), teamId, timeslot });
      
      const { data, error } = await supabase
        .from('team_timeslots')
        .insert({
          match_date: format(date, 'yyyy-MM-dd'),
          team_id: teamId,
          timeslot
        })
        .select('*, teams(id, name)')
        .single();
      
      if (error) {
        console.error('Error details:', error);
        throw error;
      }
      
      // Format the returned data to match TeamTimeslot type
      const formattedData: TeamTimeslot = {
        ...data,
        teams: data.teams ? {
          id: data.teams.id,
          name: data.teams.name,
          divisionName: null
        } : undefined
      };
      
      setTimeslots(prev => [...prev, formattedData]);
      return formattedData;
      
    } catch (error: any) {
      console.error('Error adding timeslot:', error);
      toast({
        title: "Error",
        description: `Failed to assign timeslot: ${error.message || 'Unknown error'}`,
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
        console.error('Error details:', error);
        throw error;
      }
      
      setTimeslots(prev => prev.filter(ts => ts.id !== id));
      
    } catch (error: any) {
      console.error('Error deleting timeslot:', error);
      toast({
        title: "Error",
        description: `Failed to remove timeslot: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Batch assign multiple teams to the same timeslot
  const batchAssignTimeslots = async (date: Date, teamIds: string[], timeslot: string) => {
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
        .select('*, teams(id, name)');
      
      if (error) {
        console.error('Batch insert error details:', error);
        throw error;
      }
      
      console.log('Batch assignment successful:', data);
      
      // Format the returned data to match TeamTimeslot type
      const formattedData: TeamTimeslot[] = data?.map(item => ({
        ...item,
        teams: item.teams ? {
          id: item.teams.id,
          name: item.teams.name,
          divisionName: null
        } : undefined
      })) || [];
      
      // Update local state with the newly inserted timeslots
      setTimeslots(prev => [...prev, ...formattedData]);
      return formattedData;
      
    } catch (error: any) {
      console.error('Error in batch assignment:', error);
      toast({
        title: "Error",
        description: `Failed to batch assign timeslots: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    timeslots,
    isLoading,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots
  };
};
