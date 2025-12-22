import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, History, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SeasonAccordion from "./SeasonAccordion";
import { dbLog, errorLog } from "@/utils/logger";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router-dom";
import WinterSection from "@/components/winter/WinterSection";
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      dbLog("Fetching historical seasons...");

      // Fetch all seasons
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });

      if (seasonsError) {
        errorLog("Error fetching seasons:", seasonsError);
        toast({
          title: "Error",
          description: "Failed to fetch seasons data",
          variant: "destructive"
        });
        return;
      }

      dbLog("Seasons fetched:", seasonsData);
      setSeasons(seasonsData || []);

    } catch (error) {
      errorLog("Unexpected error fetching historical data:", error);
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
        <CardContent className="py-0">
          <EmptyState
            icon={History}
            title="No Season History Yet"
            description="Past seasons and champions will appear here once the first season is completed."
            actions={[
              {
                label: "View Current Season",
                onClick: () => navigate("/schedule"),
                icon: Calendar,
              },
            ]}
            secondaryLink={{
              label: "Learn how seasons work",
              href: "/rules",
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <WinterSection showIcicles lightIcicles className="space-y-4">
      {seasons.map((season) => (
        <SeasonAccordion
          key={season.id}
          season={season}
        />
      ))}
    </WinterSection>
  );
};

export default HistoryPageContent;
