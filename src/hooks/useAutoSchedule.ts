
import { useState } from "react";
import { Team, Match } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  getTeamsByTimeBlock, 
  TIME_BLOCKS,
  generateTeamPairings, 
  filterPairsWithPreviousMatches 
} from "@/utils/autoScheduleUtils";

export const useAutoSchedule = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
  const [timeBlockTeams, setTimeBlockTeams] = useState<Record<string, Team[]>>({});
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

  // This will be expanded in Phase 2 with the full algorithm implementation
  // For now, we're just setting up the core structure

  return {
    isGenerating,
    timeBlockTeams,
    scheduledMatches,
    loadTeamsForDate,
    previewSchedule
  };
};
