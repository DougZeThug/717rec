
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
      
      // Enhanced logging to verify power score and SOS values
      console.log("Teams data loaded in useTeamsData:", teamsData.map(t => ({
        name: t.name,
        power_score: t.power_score,
        sos: t.sos,
        win_percentage: t.wins / (t.wins + t.losses),
        game_win_percentage: t.game_wins / (t.game_wins + t.game_losses),
        record: `${t.wins}-${t.losses}`,
        game_record: `${t.game_wins}-${t.game_losses}`
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
