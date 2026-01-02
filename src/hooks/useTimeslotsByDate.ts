
import { useState, useEffect } from "react";
import { TeamTimeslot } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const useTimeslotsByDate = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadTimeslots = async () => {
      if (!date) {
        setTimeslots([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
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
              logo_url,
              image_url
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
            image_url: item.teams.image_url,
            divisionName: null
          } : undefined
        })) || [];
        
        setTimeslots(formattedData);
      } catch (error) {
        console.error('Error fetching timeslots:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTimeslots();
  }, [date]);

  return { timeslots, isLoading };
};
