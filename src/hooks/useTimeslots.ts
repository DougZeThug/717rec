
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { TeamTimeslot } from "@/types";
import { useTimeslotOperations } from "./useTimeslotOperations";

export const useTimeslots = (date: Date) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { fetchTimeslotsByDate, addTimeslot, deleteTimeslot, batchAssignTimeslots } = useTimeslotOperations();

  // Format date as YYYY-MM-DD for database queries
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Fetch timeslots for the selected date
  useEffect(() => {
    const loadTimeslots = async () => {
      setIsLoading(true);
      
      try {
        const timeslotData = await fetchTimeslotsByDate(date);
        setTimeslots(timeslotData);
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
    
    loadTimeslots();
  }, [date, formattedDate, toast, fetchTimeslotsByDate]);

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
      const newTimeslots = await batchAssignTimeslots(date, teamIds, timeslot);
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
