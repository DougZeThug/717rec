
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { TeamTimeslot } from "@/types";

export const useMatchTimeslots = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupedTimeslots, setGroupedTimeslots] = useState<Record<string, TeamTimeslot[]>>({});
  
  useEffect(() => {
    const fetchTimeslots = async () => {
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
        
        console.log('Raw data from Supabase in useMatchTimeslots:', data);
        
        // Map the data to match the TeamTimeslot type
        const timeslotData: TeamTimeslot[] = data?.map(item => ({
          ...item,
          teams: item.teams ? {
            id: item.teams.id,
            name: item.teams.name,
            logo_url: item.teams.logo_url,
            divisionName: null // We can add this if needed in the future
          } : undefined
        })) || [];
        
        console.log('Formatted match timeslots data:', timeslotData);
        setTimeslots(timeslotData);
        
        // Group timeslots by timeslot value
        const grouped = timeslotData.reduce((acc: Record<string, TeamTimeslot[]>, curr) => {
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
    
    fetchTimeslots();
  }, [date]);

  return { timeslots, groupedTimeslots, isLoading };
};
