
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TeamTimeslot } from "@/types";

export const useTimeslots = (date: Date) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Format date as YYYY-MM-DD for database queries
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Fetch timeslots for the selected date
  useEffect(() => {
    const fetchTimeslots = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('team_timeslots')
          .select('*')
          .eq('match_date', formattedDate);
        
        if (error) {
          throw error;
        }
        
        setTimeslots(data || []);
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

  // Add a new timeslot assignment
  const addTimeslot = async (date: Date, teamId: string, timeslot: string) => {
    try {
      const { data, error } = await supabase
        .from('team_timeslots')
        .insert({
          match_date: format(date, 'yyyy-MM-dd'),
          team_id: teamId,
          timeslot
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      setTimeslots(prev => [...prev, data]);
      return data;
      
    } catch (error: any) {
      console.error('Error adding timeslot:', error);
      toast({
        title: "Error",
        description: "Failed to assign timeslot. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete a timeslot assignment
  const deleteTimeslot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('team_timeslots')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      setTimeslots(prev => prev.filter(ts => ts.id !== id));
      
    } catch (error: any) {
      console.error('Error deleting timeslot:', error);
      toast({
        title: "Error",
        description: "Failed to remove timeslot. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    timeslots,
    isLoading,
    addTimeslot,
    deleteTimeslot
  };
};
