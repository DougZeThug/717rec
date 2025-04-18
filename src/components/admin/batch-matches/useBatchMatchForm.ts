import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { MatchPair } from "./MatchPairsList";

export const useBatchMatchForm = (teams: Team[]) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([
    { id: '1', team1Id: null, team2Id: null, timeslot: null }
  ]);
  const { toast } = useToast();

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
    const timeslots = ['18:30', '19:30', '20:30'];
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

  const handleSubmit = async () => {
    if (!validateMatches()) return;

    try {
      const matchesToCreate = matchPairs.map(pair => ({
        team1_id: pair.team1Id,
        team2_id: pair.team2Id,
        date: selectedDate?.toISOString(),
        location: `Court ${matchPairs.indexOf(pair) + 1}`,
        iscompleted: false,
        round_number: 0,
        team1_score: 0,
        team2_score: 0,
        team1_game_wins: 0,
        team2_game_wins: 0
      }));

      const { error } = await supabase
        .from('matches')
        .insert(matchesToCreate);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created ${matchPairs.length} matches for ${selectedDate?.toLocaleDateString()}`,
      });

      // Reset form
      setMatchPairs([{ id: '1', team1Id: null, team2Id: null, timeslot: null }]);
      setSelectedDate(null);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    matchPairs,
    addMatchPair,
    updateMatchPair,
    removeMatchPair,
    autoAssignTimeslots,
    handleSubmit
  };
};
