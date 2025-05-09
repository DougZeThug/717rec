
import { useState } from "react";
import { Team, Match } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  getTeamsByTimeBlock, 
  TIME_BLOCKS,
  generateTeamPairings, 
  filterPairsWithPreviousMatches,
  haveTeamsPlayed,
  calculateTeamCompatibility
} from "@/utils/autoScheduleUtils";

interface TeamPairing {
  team1: Team;
  team2: Team;
  compatibilityScore: number;
  hasPlayedBefore?: boolean;
}

export const useAutoSchedule = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
  const [timeBlockTeams, setTimeBlockTeams] = useState<Record<string, Team[]>>({});
  const [generatedPairings, setGeneratedPairings] = useState<Record<string, TeamPairing[]>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Load teams for each time block on a specific date
   */
  const loadTeamsForDate = async (date: Date) => {
    try {
      setIsGenerating(true);
      
      // Get teams for each time block
      const timeBlocks = Object.keys(TIME_BLOCKS);
      const teamsData: Record<string, Team[]> = {};
      
      for (const block of timeBlocks) {
        const teams = await getTeamsByTimeBlock(date, block);
        teamsData[block] = teams;
        console.log(`Loaded ${teams.length} teams for ${block} block`);
      }
      
      setTimeBlockTeams(teamsData);
      return teamsData;
    } catch (error) {
      console.error('Error loading teams for date:', error);
      toast({
        title: "Error",
        description: "Failed to load teams. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Preview matches for schedule generation
   */
  const previewSchedule = async (date: Date) => {
    try {
      setIsGenerating(true);
      
      // Reset previously scheduled matches
      setScheduledMatches([]);
      
      // Load teams for each time block if not loaded yet
      const teamsData = timeBlockTeams.hasOwnProperty("6:30") 
        ? timeBlockTeams 
        : await loadTeamsForDate(date);
        
      if (!teamsData) return;
      
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
          variant: "destructive"  // Changed from "warning" to "destructive"
        });
      }
      
      // This is a preview - we'll just return a sample of what will be done
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
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate match pairings for each time block
   */
  const generateMatchPairings = async (date: Date) => {
    try {
      setIsGenerating(true);
      
      // Reset previously generated pairings
      setGeneratedPairings({});
      
      // Load teams for each time block if not loaded yet
      const teamsData = timeBlockTeams.hasOwnProperty("6:30") 
        ? timeBlockTeams 
        : await loadTeamsForDate(date);
        
      if (!teamsData) return null;
      
      // Generate pairings for each block
      const pairings: Record<string, TeamPairing[]> = {};
      
      for (const [block, teams] of Object.entries(teamsData)) {
        // Skip blocks with odd number of teams for now
        // In production, should handle this by having a "bye" team
        if (teams.length % 2 !== 0) {
          console.log(`Block ${block} has odd number of teams (${teams.length}), skipping for now`);
          pairings[block] = [];
          continue;
        }
        
        // Simple algorithm: sort by compatibility and match teams
        const blockPairings: TeamPairing[] = [];
        const availableTeams = [...teams];
        
        while (availableTeams.length >= 2) {
          // Get first team
          const team1 = availableTeams.shift()!;
          
          // Find best match for team1
          let bestMatch = { team: availableTeams[0], score: -1, index: 0 };
          
          for (let i = 0; i < availableTeams.length; i++) {
            const team2 = availableTeams[i];
            const score = calculateTeamCompatibility(team1, team2);
            
            if (score > bestMatch.score) {
              bestMatch = { team: team2, score, index: i };
            }
          }
          
          // Remove the matched team from available teams
          availableTeams.splice(bestMatch.index, 1);
          
          // Check if teams have played before
          const hasPlayedBefore = await haveTeamsPlayed(team1.id, bestMatch.team.id);
          
          // Add pairing
          blockPairings.push({
            team1,
            team2: bestMatch.team,
            compatibilityScore: bestMatch.score,
            hasPlayedBefore
          });
        }
        
        pairings[block] = blockPairings;
        console.log(`Generated ${blockPairings.length} pairings for ${block} block`);
      }
      
      // Store generated pairings
      setGeneratedPairings(pairings);
      
      return pairings;
    } catch (error) {
      console.error('Error generating match pairings:', error);
      toast({
        title: "Error",
        description: "Failed to generate match pairings. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Convert pairings to match format for batch creation
   */
  const convertPairingsToMatches = (pairings: Record<string, TeamPairing[]>, date: Date) => {
    const matches: {
      team1Id: string;
      team2Id: string;
      timeslot: string;
    }[] = [];
    
    Object.entries(pairings).forEach(([block, blockPairings]) => {
      blockPairings.forEach((pairing, index) => {
        // Alternate between main and secondary timeslots
        const timeslot = index % 2 === 0 
          ? TIME_BLOCKS[block].main 
          : TIME_BLOCKS[block].secondary;
        
        matches.push({
          team1Id: pairing.team1.id,
          team2Id: pairing.team2.id,
          timeslot,
        });
      });
    });
    
    return matches;
  };

  // Return relevant functions and state for auto-scheduling
  return {
    isGenerating,
    timeBlockTeams,
    scheduledMatches,
    generatedPairings,
    loadTeamsForDate,
    previewSchedule,
    generateMatchPairings,
    convertPairingsToMatches,
  };
};
