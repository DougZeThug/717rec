
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { MatchPair } from "./MatchPairsList";
import { createDateWithTime } from "@/components/schedule/form-utils";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeTimeFormat } from "@/utils/timeUtils";

export const useBatchMatchForm = (teams: Team[]) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([
    { id: '1', team1Id: null, team2Id: null, timeslot: null }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMatchPair = () => {
    setMatchPairs([
      ...matchPairs,
      {
        id: Date.now().toString(),
        team1Id: null,
        team2Id: null,
        timeslot: null
      }
    ]);
  };

  const updateMatchPair = (id: string, updates: Partial<MatchPair>) => {
    setMatchPairs(matchPairs.map(pair => 
      pair.id === id ? { ...pair, ...updates } : pair
    ));
  };

  const removeMatchPair = (id: string) => {
    setMatchPairs(matchPairs.filter(pair => pair.id !== id));
  };

  const autoAssignTimeslots = () => {
    // Use standard 12-hour format for consistency
    const timeslots = ['6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];
    const updatedPairs = matchPairs.map((pair, index) => ({
      ...pair,
      timeslot: timeslots[index % timeslots.length]
    }));
    setMatchPairs(updatedPairs);
  };

  const validateMatches = () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive"
      });
      return false;
    }

    const usedTeams = new Set<string>();
    for (const pair of matchPairs) {
      if (!pair.team1Id || !pair.team2Id || !pair.timeslot) {
        toast({
          title: "Error",
          description: "Please fill in all match details",
          variant: "destructive"
        });
        return false;
      }

      if (usedTeams.has(pair.team1Id) || usedTeams.has(pair.team2Id)) {
        toast({
          title: "Error",
          description: "Teams cannot be used in multiple matches",
          variant: "destructive"
        });
        return false;
      }

      usedTeams.add(pair.team1Id);
      usedTeams.add(pair.team2Id);
    }

    return true;
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!validateMatches()) return false;
    
    setIsSubmitting(true);

    try {
      const matchesToCreate = matchPairs.map(pair => {
        // Create a date with the selected timeslot
        // Ensure the timeslot is properly formatted
        const timeslot = pair.timeslot || "6:30 PM"; // Default to 6:30 PM if missing
        
        // Create a date with the selected timeslot
        const dateWithTime = createDateWithTime(
          selectedDate as Date,
          timeslot
        );
        
        console.log("Creating match at date:", dateWithTime.toISOString(), "with timeslot:", timeslot);
        
        return {
          team1_id: pair.team1Id,
          team2_id: pair.team2Id,
          date: dateWithTime.toISOString(),
          location: `Court ${matchPairs.indexOf(pair) + 1}`,
          iscompleted: false,
          round_number: 0,
          team1_score: 0,
          team2_score: 0,
          team1_game_wins: 0,
          team2_game_wins: 0
        };
      });

      console.log("Batch creating matches:", matchesToCreate);

      const { data, error } = await supabase
        .from('matches')
        .insert(matchesToCreate)
        .select();

      if (error) throw error;

      console.log("Successfully created matches:", data);
      
      toast({
        title: "Success",
        description: `Created ${matchPairs.length} matches for ${selectedDate?.toLocaleDateString()}`,
      });

      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      
      // Reset form
      setMatchPairs([{ id: '1', team1Id: null, team2Id: null, timeslot: null }]);
      setSelectedDate(null);
      
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      console.error("Error creating matches:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    matchPairs,
    isSubmitting,
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit
  };
};
