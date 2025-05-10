
import { useState, useEffect } from "react";
import { TeamTimeslot, TimeslotGroup } from "@/types/timeslots";
import { TimeslotService } from "@/services/timeslots/TimeslotService";
import { TimeslotTransformer } from "@/services/timeslots/TimeslotTransformer";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export const useTimeslotQuery = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [groupedTimeslots, setGroupedTimeslots] = useState<TimeslotGroup>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch timeslots for the selected date
  useEffect(() => {
    const loadTimeslots = async () => {
      if (!date) {
        setTimeslots([]);
        setGroupedTimeslots({});
        setIsLoading(false);
        setError(null);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await TimeslotService.fetchByDate(date);
        
        if (!result.success) {
          setError(result.error || 'Failed to load timeslots');
          setTimeslots([]);
          setGroupedTimeslots({});
          return;
        }
        
        const formattedData = result.data as TeamTimeslot[];
        setTimeslots(formattedData);
        
        // Group timeslots by timeslot value
        const grouped = TimeslotTransformer.groupByTimeslot(formattedData);
        setGroupedTimeslots(grouped);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTimeslots();
  }, [date]);

  // Add a 30-second polling mechanism to refresh timeslots
  useEffect(() => {
    if (!date) return;
    
    const intervalId = setInterval(async () => {
      queryClient.invalidateQueries({ queryKey: ['timeslots', format(date, 'yyyy-MM-dd')] });
      
      // Re-fetch timeslots
      const result = await TimeslotService.fetchByDate(date);
      
      if (result.success && result.data) {
        const formattedData = result.data as TeamTimeslot[];
        setTimeslots(formattedData);
        
        // Group timeslots
        const grouped = TimeslotTransformer.groupByTimeslot(formattedData);
        setGroupedTimeslots(grouped);
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [date, queryClient]);

  return { 
    timeslots,
    groupedTimeslots,
    isLoading,
    error
  };
};
