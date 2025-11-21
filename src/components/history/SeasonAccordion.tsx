import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, Calendar, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DivisionPanel from "./DivisionPanel";
import SeasonMetaBar from "./SeasonMetaBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHistoryDivisionDisplayName, sortHistoryDivisions } from "@/utils/historyDivisionUtils";

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

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
  playoff_rank: number | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
}

const useSeasonData = (seasonId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['season-data', seasonId],
    queryFn: async () => {
      console.log(`🔍 Season ${seasonId}: Starting season data query...`);
      
      try {
        const { data, error } = await supabase
          .from('team_season_stats')
          .select(`
            team_id,
            season_id,
            match_wins,
            match_losses,
            game_wins,
            game_losses,
            sos,
            power_score,
            champion,
            runner_up,
            division_name,
            playoff_rank,
            teams:team_id (
              name,
              logo_url,
              image_url
            )
          `)
          .eq('season_id', seasonId)
          .order('division_name', { ascending: true })
          .order('playoff_rank', { ascending: true, nullsFirst: false });

        console.log(`📊 Season ${seasonId}: Query completed`);
        console.log(`📊 Season ${seasonId}: Raw data:`, data);
        console.log(`❌ Season ${seasonId}: Error (if any):`, error);

        if (error) {
          console.error(`❌ Season ${seasonId}: Database error:`, {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        // Transform the data structure
        const transformedData = (data || []).map((item: any) => ({
          team_id: item.team_id,
          season_id: item.season_id,
          match_wins: item.match_wins,
          match_losses: item.match_losses,
          game_wins: item.game_wins,
          game_losses: item.game_losses,
          sos: item.sos,
          power_score: item.power_score,
          champion: item.champion,
          runner_up: item.runner_up,
          division_name: item.division_name,
          playoff_rank: item.playoff_rank,
          team_name: item.teams?.name || 'Unknown Team',
          team_logo_url: item.teams?.logo_url,
          team_image_url: item.teams?.image_url,
        })) as SeasonData[];

        console.log(`✅ Season ${seasonId}: Transformed ${transformedData.length} team records`);
        return transformedData;
      } catch (err) {
        console.error(`💥 Season ${seasonId}: Exception in query:`, err);
        throw err;
      }
    },
    enabled,
    retry: 2,
    retryDelay: 1000,
  });
};

interface SeasonAccordionProps {
  season: Season;
}

const SeasonAccordion: React.FC<SeasonAccordionProps> = ({ season }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: seasonData, isLoading, error, refetch, isRefetching } = useSeasonData(season.id, isExpanded);

  console.log(`🎯 Season ${season.name}: Accordion state - expanded: ${isExpanded}, loading: ${isLoading}, hasData: ${!!seasonData}`);

  const handleToggle = () => {
    console.log(`🎯 Season ${season.name}: Toggling accordion from ${isExpanded} to ${!isExpanded}`);
    setIsExpanded(!isExpanded);
  };

  // Group data by division with proper display names and ordering
  const divisionData = React.useMemo(() => {
    if (!seasonData) return {};
    
    // Filter out Hidden division teams and group by display division name
    const grouped = seasonData
      .filter(team => {
        const displayDivision = getHistoryDivisionDisplayName(team.division_name);
        return displayDivision !== 'Hidden';
      })
      .reduce((acc, team) => {
        const displayDivision = getHistoryDivisionDisplayName(team.division_name);
        if (!acc[displayDivision]) {
          acc[displayDivision] = [];
        }
        acc[displayDivision].push(team);
        return acc;
      }, {} as Record<string, SeasonData[]>);

    console.log(`📊 Season ${season.name}: Grouped data by divisions:`, Object.keys(grouped));
    return grouped;
  }, [seasonData, season.name]);

  const hasChampions = seasonData?.some(team => team.champion) || false;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
      <button
        onClick={handleToggle}
        className={cn(
          "w-full p-4 md:p-6 text-left transition-all duration-200",
          "hover:bg-gray-50 dark:hover:bg-slate-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
          isExpanded && "bg-gray-50 dark:bg-slate-700"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className={cn(
              "w-5 h-5",
              hasChampions ? "text-yellow-500" : "text-gray-400"
            )} />
            <div>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                {season.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Calendar className="w-4 h-4" />
                {season.is_active && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-gray-400 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-4 md:p-6 pt-0 border-t border-gray-200 dark:border-slate-600">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-600 dark:text-red-400 mb-4">
                    <Trophy className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">Failed to load season data</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {error instanceof Error ? error.message : 'An unexpected error occurred'}
                    </p>
                    <Button 
                      onClick={() => refetch()} 
                      disabled={isRefetching}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                      {isRefetching ? 'Retrying...' : 'Try Again'}
                    </Button>
                  </div>
                </div>
              ) : season.is_active && (!seasonData || seasonData.length === 0) ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Season in progress – check back later</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {sortHistoryDivisions(Object.entries(divisionData)).map(([divisionName, teams]) => (
                      <DivisionPanel
                        key={divisionName}
                        divisionName={divisionName}
                        teams={teams}
                      />
                    ))}
                  </div>
                  
                  <SeasonMetaBar 
                    season={season}
                    seasonData={seasonData || []}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeasonAccordion;
