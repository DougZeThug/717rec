
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { TeamTimeslot } from "@/types";
import { useTimeslotOperations } from "./useTimeslotOperations";

export const useTimeslotsByDate = (date: Date | null) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchTimeslotsByDate } = useTimeslotOperations();
  
  useEffect(() => {
    const loadTimeslots = async () => {
      if (!date) {
        setTimeslots([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Use the operations hook to fetch timeslots
        const formattedData = await fetchTimeslotsByDate(date);
        setTimeslots(formattedData);
      } catch (error: any) {
        console.error('Error fetching timeslots:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTimeslots();
  }, [date, fetchTimeslotsByDate]);

  return { timeslots, isLoading };
};
