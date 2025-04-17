
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { TeamTimeslot } from "@/types";

export const useTimeslotsByDate = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchTimeslots = async () => {
      if (!date) {
        setTimeslots([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Format date as YYYY-MM-DD for database queries
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('team_timeslots')
          .select('*, teams(id, name, logo_url)')
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
        
        setTimeslots(formattedData);
      } catch (error: any) {
        console.error('Error fetching timeslots:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimeslots();
  }, [date]);

  return { timeslots, isLoading };
};
