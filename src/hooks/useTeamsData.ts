
import { useState, useEffect } from 'react';
import { Team } from "@/types";
import { fetchTeamsFromApi } from "@/services/TeamService";
import { useToast } from "@/hooks/use-toast";

export function useTeamsData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const teamsData = await fetchTeamsFromApi();
      setTeams(teamsData);
      
      if (teamsData.length === 0) {
        toast({
          title: "No Teams Found",
          description: "No teams were found in the database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast({
        title: "Error",
        description: "Failed to fetch teams. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  return {
    teams,
    isLoading,
    fetchTeams
  };
}
