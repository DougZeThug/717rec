
import { useState, useEffect } from "react";
import { TeamTimeslot } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const useMatchTimeslots = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupedTimeslots, setGroupedTimeslots] = useState<Record<string, TeamTimeslot[]>>({});
  
  useEffect(() => {
    const loadTimeslots = async () => {
      if (!date) {
        setTimeslots([]);
        setGroupedTimeslots({});
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
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
              logo_url
            )
          `)
          .eq('match_date', formattedDate);
        
        if (error) {
          throw error;
        }
        
        // Console log for debugging (once per render)
        console.log('Formatted match timeslots data:', data);
        
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
        
        // Group timeslots by timeslot value
        const grouped = formattedData.reduce((acc: Record<string, TeamTimeslot[]>, curr) => {
          if (!curr.timeslot) return acc;
          
          if (!acc[curr.timeslot]) {
            acc[curr.timeslot] = [];
          }
          
          acc[curr.timeslot].push(curr);
          return acc;
        }, {});
        
        // Sort the timeslots object by keys (time values)
        const sortedGrouped = Object.keys(grouped)
          .sort()
          .reduce((acc: Record<string, TeamTimeslot[]>, key) => {
            acc[key] = grouped[key];
            return acc;
          }, {});
          
        setGroupedTimeslots(sortedGrouped);
      } catch (error: any) {
        console.error('Error fetching timeslots:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTimeslots();
  }, [date]);

  return { timeslots, groupedTimeslots, isLoading };
};
