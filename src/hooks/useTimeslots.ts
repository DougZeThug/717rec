
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TeamTimeslot } from "@/types";
import { useTimeslotOperations } from "./useTimeslotOperations";

export const useTimeslots = (date: Date) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { addTimeslot, deleteTimeslot, batchAssignTimeslots: batchAssign } = useTimeslotOperations();

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

  // Wrapper for the addTimeslot function that also updates local state
  const handleAddTimeslot = async (date: Date, teamId: string, timeslot: string) => {
    try {
      const newTimeslot = await addTimeslot(date, teamId, timeslot);
      setTimeslots(prev => [...prev, newTimeslot]);
      return newTimeslot;
    } catch (error) {
      // Error handling is done in the operations hook
      throw error;
    }
  };

  // Wrapper for the deleteTimeslot function that also updates local state
  const handleDeleteTimeslot = async (id: string) => {
    try {
      await deleteTimeslot(id);
      setTimeslots(prev => prev.filter(ts => ts.id !== id));
    } catch (error) {
      // Error handling is done in the operations hook
    }
  };

  // Wrapper for the batchAssignTimeslots function that also updates local state
  const handleBatchAssignTimeslots = async (date: Date, teamIds: string[], timeslot: string) => {
    try {
      const newTimeslots = await batchAssign(date, teamIds, timeslot);
      setTimeslots(prev => [...prev, ...newTimeslots]);
      return newTimeslots;
    } catch (error) {
      // Error handling is done in the operations hook
      throw error;
    }
  };

  return {
    timeslots,
    isLoading,
    addTimeslot: handleAddTimeslot,
    deleteTimeslot: handleDeleteTimeslot,
    batchAssignTimeslots: handleBatchAssignTimeslots
  };
};
