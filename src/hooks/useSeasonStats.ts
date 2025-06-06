
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SeasonStat {
  season_id: string;
  team_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  power_score: number;
  sos: number;
  recorded_at: string;
  team_name?: string;
}

export function useSeasonStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [seasonStats, setSeasonStats] = useState<SeasonStat[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);

  const fetchSeasons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_season_stats')
        .select('season_id')
        .order('season_id');

      if (error) throw error;
      
      // Process the data to get unique season_ids
      const seasonIds = data.map(item => item.season_id);
      const uniqueSeasons = [...new Set(seasonIds)];
      
      setSeasons(uniqueSeasons);
      return uniqueSeasons;
    } catch (error: any) {
      console.error("Error fetching seasons:", error);
      toast({
        title: "Error",
        description: "Failed to fetch seasons.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatsBySeason = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_season_stats')
        .select(`
          season_id,
          team_id,
          match_wins,
          match_losses,
          game_wins,
          game_losses,
          power_score,
          sos,
          recorded_at,
          teams:team_id (name)
        `)
        .eq('season_id', seasonId)
        .order('power_score', { ascending: false });

      if (error) throw error;
      
      const statsWithTeamNames = data.map(stat => ({
        ...stat,
        team_name: stat.teams?.name,
      }));
      
      setSeasonStats(statsWithTeamNames);
      return statsWithTeamNames;
    } catch (error: any) {
      console.error("Error fetching season stats:", error);
      toast({
        title: "Error",
        description: "Failed to fetch season stats.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    seasonStats,
    seasons,
    fetchSeasons,
    fetchStatsBySeason,
  };
}
