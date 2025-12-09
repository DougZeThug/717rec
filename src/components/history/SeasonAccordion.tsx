import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, Calendar, RefreshCw, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DivisionPanel from "./DivisionPanel";
import SeasonMetaBar from "./SeasonMetaBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHistoryDivisionDisplayName, sortHistoryDivisions } from "@/utils/historyDivisionUtils";
import { dbLog, errorLog } from "@/utils/logger";

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
      dbLog(`Season ${seasonId}: Starting season data query...`);
      
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

        if (error) {
          errorLog(`Season ${seasonId}: Database error:`, error);
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

        dbLog(`Season ${seasonId}: Transformed ${transformedData.length} team records`);
        return transformedData;
      } catch (err) {
        errorLog(`Season ${seasonId}: Exception in query:`, err);
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

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Group data by division with proper display names and ordering
  const divisionData = React.useMemo(() => {
    if (!seasonData) return {};
    
    // Filter out Hidden divisions and group by display division name
    const grouped = seasonData
      .filter(team => {
        const displayDivision = getHistoryDivisionDisplayName(team.division_name);
        return !displayDivision.toLowerCase().startsWith('hidden');
      })
      .reduce((acc, team) => {
        const displayDivision = getHistoryDivisionDisplayName(team.division_name);
        if (!acc[displayDivision]) {
          acc[displayDivision] = [];
        }
        acc[displayDivision].push(team);
        return acc;
      }, {} as Record<string, SeasonData[]>);

    return grouped;
  }, [seasonData, season.name]);

  const hasChampions = seasonData?.some(team => team.champion) || false;

  // Count total teams and matches
  const teamCount = seasonData?.length || 0;
  const totalMatches = seasonData?.reduce((sum, t) => sum + (t.match_wins || 0) + (t.match_losses || 0), 0) || 0;
  const matchCount = Math.floor(totalMatches / 2); // Each match counted twice (once per team)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-slate-700">
      <button
        onClick={handleToggle}
        className={cn(
          "w-full p-4 md:p-6 text-left transition-all duration-200",
          "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-amber-50/30",
          "dark:hover:from-slate-700/50 dark:hover:to-slate-700/30",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
          isExpanded && "bg-gradient-to-r from-blue-50/30 to-amber-50/20 dark:from-slate-700/40 dark:to-slate-700/20"
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              hasChampions 
                ? "bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/40 dark:to-amber-800/40" 
                : "bg-gray-100 dark:bg-gray-700"
            )}>
              <Trophy className={cn(
                "w-5 h-5",
                hasChampions ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400"
              )} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bebas uppercase tracking-wide text-slate-900 dark:text-white">
                {season.name}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                {teamCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {teamCount} teams
                  </span>
                )}
                {matchCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {matchCount} matches
                  </span>
                )}
                {season.is_active && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
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
