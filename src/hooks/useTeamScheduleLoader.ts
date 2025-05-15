
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
        simpleDateString: normalizeDate(date, 'useTeamScheduleLoader')
      });
      
      // Get teams for each time block
      const timeBlocks = Object.keys(TIME_BLOCKS); // ["6:30", "7:30", "8:30"]
      const teamsData: TimeBlockTeamsMap = {};
      
      for (const block of timeBlocks) {
        const teams = await getTeamsByTimeBlock(date, block);
        teamsData[block] = teams;
        console.log(`Loaded ${teams.length} teams for ${block} block`);
      }
      
      console.log("Final teams data:", teamsData);
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
