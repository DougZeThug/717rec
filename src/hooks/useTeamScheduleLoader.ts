
import { useState } from "react";
import { Team } from "@/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getTeamsByTimeBlock } from "@/utils/autoSchedule/teamLoaderUtils";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";
import { TIME_BLOCKS } from "@/utils/autoSchedule/constants";

export const useTeamScheduleLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});
  const { toast } = useToast();

  const loadTeamsForDate = async (date: Date): Promise<TimeBlockTeamsMap | null> => {
    try {
      setIsLoading(true);
      
      // Get teams for each time block - updated to use keys from TIME_BLOCKS
      const timeBlocks = Object.keys(TIME_BLOCKS); // ["6:30 PM", "7:30 PM", "8:30 PM"]
      const teamsData: TimeBlockTeamsMap = {};
      
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

  return {
    isLoading,
    timeBlockTeams,
    loadTeamsForDate,
    getTeamCountStatus
  };
};
