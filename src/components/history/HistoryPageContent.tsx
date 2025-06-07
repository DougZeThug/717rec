
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SeasonAccordion from "./SeasonAccordion";

interface SeasonData {
  team_id: string;
  season_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number | null;
  power_score: number | null;
  champion: boolean;
  runner_up: boolean;
  division_name: string | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
}

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

const HistoryPageContent: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonData, setSeasonData] = useState<Record<string, SeasonData[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      console.log("Fetching historical seasons and team data...");

      // Fetch all seasons
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });

      if (seasonsError) {
        console.error("Error fetching seasons:", seasonsError);
        toast({
          title: "Error",
          description: "Failed to fetch seasons data",
          variant: "destructive"
        });
        return;
      }

      console.log("Seasons fetched:", seasonsData);
      setSeasons(seasonsData || []);

      // Fetch team season stats with team details including runner_up field
      const { data: statsData, error: statsError } = await supabase
        .from('team_season_stats')
        .select(`
          *,
          teams:team_id (
            name,
            logo_url,
            image_url
          )
        `)
        .order('season_id');

      if (statsError) {
        console.error("Error fetching team season stats:", statsError);
        toast({
          title: "Error", 
          description: "Failed to fetch team statistics",
          variant: "destructive"
        });
        return;
      }

      console.log("Team season stats fetched:", statsData);

      // Group data by season
      const groupedData: Record<string, SeasonData[]> = {};
      statsData?.forEach((stat) => {
        if (!groupedData[stat.season_id]) {
          groupedData[stat.season_id] = [];
        }
        
        groupedData[stat.season_id].push({
          team_id: stat.team_id,
          season_id: stat.season_id,
          match_wins: stat.match_wins,
          match_losses: stat.match_losses,
          game_wins: stat.game_wins,
          game_losses: stat.game_losses,
          sos: stat.sos,
          power_score: stat.power_score,
          champion: stat.champion,
          runner_up: stat.runner_up, // Include the new runner_up field
          division_name: stat.division_name,
          team_name: stat.teams?.name || 'Unknown Team',
          team_logo_url: stat.teams?.logo_url || null,
          team_image_url: stat.teams?.image_url || null,
        });
      });

      console.log("Grouped season data:", groupedData);
      setSeasonData(groupedData);

    } catch (error) {
      console.error("Unexpected error fetching historical data:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading historical data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (seasons.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No historical seasons found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Season History
        </h2>
        <p className="text-muted-foreground">
          Explore past seasons, champions, runners-up, and standings
        </p>
      </div>

      <div className="space-y-4">
        {seasons.map((season) => (
          <SeasonAccordion
            key={season.id}
            season={season}
            teams={seasonData[season.id] || []}
          />
        ))}
      </div>
    </div>
  );
};

export default HistoryPageContent;
