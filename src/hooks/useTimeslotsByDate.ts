
import { useState, useEffect } from "react";
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
        const timeslotData = await fetchTimeslotsByDate(date);
        setTimeslots(timeslotData);
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
