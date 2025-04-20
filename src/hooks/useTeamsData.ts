
import { useState, useEffect } from 'react';
import { Team } from "@/types";
import { fetchTeamsFromApi } from "@/services/teams/TeamFetchService";
import { useToast } from "@/hooks/use-toast";

export function useTeamsData() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      const teamsData = await fetchTeamsFromApi();
      
      // Log teams data to verify Power Score values
      console.log("Teams with Power Score > 0.4:", teamsData.filter(t => t.power_score > 0.4).map(t => ({
        name: t.name,
        power_score: t.power_score,
        sos: t.sos,
        wins: t.wins,
        losses: t.losses
      })));
      
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
