
import { useState } from "react";
import { Team, Match } from "@/types";
import { TimeBlockTeamsMap, TeamPairingMap, PreviewResult } from "@/types/autoSchedule";
import { useTeamScheduleLoader } from "./useTeamScheduleLoader";
import { usePairingGenerator } from "./usePairingGenerator";
import { useToast } from "@/hooks/use-toast";
import { TIME_BLOCKS } from "@/utils/autoSchedule/constants";

export type AutoScheduleStep = 'teams' | 'pairings';

export const useSchedulePreview = () => {
  const [autoScheduleStep, setAutoScheduleStep] = useState<AutoScheduleStep>('teams');
  const { isLoading, timeBlockTeams, loadTeamsForDate, getTeamCountStatus } = useTeamScheduleLoader();
  const { isGenerating, generatedPairings, generateMatchPairings } = usePairingGenerator();
  const { toast } = useToast();

  const previewSchedule = async (date: Date): Promise<PreviewResult | null> => {
    try {
      // Load teams for each time block if not loaded yet
      const teamsData = timeBlockTeams && Object.keys(timeBlockTeams).length > 0 
        ? timeBlockTeams 
        : await loadTeamsForDate(date);
        
      if (!teamsData) return null;
      
      // Check if we have even number of teams in each block
      const unmatchableBlocks: string[] = [];
      Object.entries(teamsData).forEach(([block, teams]) => {
        if (teams.length % 2 !== 0) {
          unmatchableBlocks.push(block);
        }
      });
      
      if (unmatchableBlocks.length > 0) {
        toast({
          title: "Warning",
          description: `Blocks with odd number of teams: ${unmatchableBlocks.join(', ')}. Some teams may not get matched.`,
          variant: "destructive"
        });
      }
      
      return {
        date,
        timeBlocks: teamsData,
        unmatchableBlocks
      };
      
    } catch (error) {
      console.error('Error previewing schedule:', error);
      toast({
        title: "Error",
        description: "Failed to preview schedule. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleGenerateSchedule = async (date: Date) => {
    if (!date) {
      toast({
        title: "Select Date",
        description: "Please select a date first.",
        variant: "destructive"
      });
      return null;
    }
    
    const pairings = await generateMatchPairings(date, timeBlockTeams);
    
    if (pairings) {
      toast({
        title: "Schedule Generated",
        description: "Match pairings have been generated based on team compatibility.",
      });
      setAutoScheduleStep('pairings');
      return pairings;
    }
    
    return null;
  };

  const convertPairingsToMatches = (
    pairings: TeamPairingMap,
    date: Date
  ): {
    id: string;
    team1Id: string;
    team2Id: string;
    timeslot: string;
  }[] => {
    const matches = [];
    
    Object.entries(pairings).forEach(([block, blockPairings]) => {
      blockPairings.forEach((pairing, index) => {
        // Alternate between main and secondary timeslots
        const timeslot = index % 2 === 0 
          ? TIME_BLOCKS[block].main 
          : TIME_BLOCKS[block].secondary;
        
        matches.push({
          id: Date.now().toString() + '-' + block + '-' + index,
          team1Id: pairing.team1.id,
          team2Id: pairing.team2.id,
          timeslot,
        });
      });
    });
    
    return matches;
  };

  return {
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    previewSchedule,
    handleGenerateSchedule,
    convertPairingsToMatches,
    getTeamCountStatus
  };
};
