
import { useState, useEffect } from "react";
import { TeamTimeslot } from "@/types";
import { useTimeslotOperations } from "./useTimeslotOperations";

export const useMatchTimeslots = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupedTimeslots, setGroupedTimeslots] = useState<Record<string, TeamTimeslot[]>>({});
  const { fetchTimeslotsByDate } = useTimeslotOperations();
  
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
        const timeslotData = await fetchTimeslotsByDate(date);
        
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
    
    loadTimeslots();
  }, [date, fetchTimeslotsByDate]);

  return { timeslots, groupedTimeslots, isLoading };
};
