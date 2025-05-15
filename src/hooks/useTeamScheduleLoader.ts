
import { useState } from "react";
import { Team } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { getTeamsByTimeBlock } from "@/utils/autoSchedule/teamLoaderUtils";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";
import { TIME_BLOCKS } from "@/utils/autoSchedule/constants";
import { normalizeDate } from "@/utils/dateNormalization";

export const useTeamScheduleLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});
  const { toast } = useToast();

  const loadTeamsForDate = async (date: Date): Promise<TimeBlockTeamsMap | null> => {
    try {
      setIsLoading(true);
      
      // Log the original date
      console.log("Loading teams for date:", {
        originalDate: date,
        originalDateString: date.toString(),
        originalDateIso: date.toISOString(),
        simpleDateString: normalizeDate(date, 'useTeamScheduleLoader'),
        availableTimeBlocks: Object.keys(TIME_BLOCKS)
      });
      
      // Get teams for each time block
      const timeBlocks = Object.keys(TIME_BLOCKS); // Now using full time block strings like "6:30 PM"
      const teamsData: TimeBlockTeamsMap = {};
      
      let totalTeamsFound = 0;
      let oddBlocksCount = 0;
      
      // Track detailed stats for debugging
      const blockStats: Record<string, { requested: string, found: number, isOdd: boolean }> = {};
      
      for (const block of timeBlocks) {
        const teams = await getTeamsByTimeBlock(date, block);
        teamsData[block] = teams;
        totalTeamsFound += teams.length;
        
        const isOdd = teams.length % 2 !== 0;
        if (isOdd) oddBlocksCount++;
        
        blockStats[block] = {
          requested: block,
          found: teams.length,
          isOdd
        };
        
        console.log(`Loaded ${teams.length} teams for "${block}" block (${isOdd ? 'odd' : 'even'} count)`);
      }
      
      console.log("Teams loading summary:", {
        date: normalizeDate(date, 'summary'),
        totalTeams: totalTeamsFound,
        oddBlocks: oddBlocksCount,
        blockStats
      });
      
      if (totalTeamsFound === 0) {
        console.warn("No teams found for any time block. Possible issues:");
        console.warn("1. No team assignments exist for this date");
        console.warn("2. Time block format in database doesn't match what we're querying");
        console.warn("3. Date format mismatch");
        
        toast({
          title: "No teams found",
          description: `No teams scheduled for ${normalizeDate(date, 'toast')}. Please check team assignments.`,
          variant: "destructive"
        });
      } else if (oddBlocksCount > 0) {
        // Still show a toast but make it a warning instead of an error
        toast({
          title: "Teams loaded with warnings",
          description: `${oddBlocksCount} ${oddBlocksCount === 1 ? 'block has' : 'blocks have'} odd team counts. Some teams may be left unmatched.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Teams loaded successfully",
          description: `${totalTeamsFound} teams loaded across ${Object.keys(blockStats).length} time blocks`,
        });
      }
      
      console.log("Final teams data:", teamsData);
      setTimeBlockTeams(teamsData);
      return teamsData;
    } catch (error) {
      console.error('Error loading teams for date:', error);
      toast({
        title: "Error",
        description: "Failed to load teams. Please check console for details.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamCountStatus = () => {
    if (!timeBlockTeams || Object.keys(timeBlockTeams).length === 0) {
      return { total: 0, odd: 0 };
    }
    
    let totalTeams = 0;
    let oddBlocks = 0;
    
    Object.entries(timeBlockTeams).forEach(([block, teams]) => {
      totalTeams += teams.length;
      if (teams.length % 2 !== 0) oddBlocks++;
    });
    
    return { total: totalTeams, odd: oddBlocks };
  };
  
  const getTeamCountsPerBlock = () => {
    // Return detailed information about team counts per block
    const blockCounts: Record<string, { count: number, isOdd: boolean }> = {};
    
    if (timeBlockTeams) {
      Object.entries(timeBlockTeams).forEach(([block, teams]) => {
        blockCounts[block] = {
          count: teams.length,
          isOdd: teams.length % 2 !== 0
        };
      });
    }
    
    return blockCounts;
  };

  return {
    isLoading,
    timeBlockTeams,
    loadTeamsForDate,
    getTeamCountStatus,
    getTeamCountsPerBlock
  };
};
