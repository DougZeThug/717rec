
import React, { useState, useEffect } from "react";
import ChampionCard from "./ChampionCard";
import HistoricalStandingsTable from "./HistoricalStandingsTable";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from "@/hooks/use-mobile";

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
  playoff_rank: number | null;
}

interface DivisionPanelProps {
  divisionName: string;
  teams: SeasonData[];
}

const DivisionPanel: React.FC<DivisionPanelProps> = ({ divisionName, teams }) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Collapse divisions on mobile after initial mount
  useEffect(() => {
    if (isMobile) {
      setIsExpanded(false);
    }
  }, []);
  
  const champion = teams.find(team => team.champion);
  
  // Sort teams by playoff_rank (1st, 2nd, 3rd, etc.) with fallback to match wins
  const sortedTeams = [...teams].sort((a, b) => {
    // If both teams have playoff ranks, sort by playoff rank (lower is better)
    if (a.playoff_rank !== null && b.playoff_rank !== null) {
      return a.playoff_rank - b.playoff_rank;
    }
    
    // If only one team has a playoff rank, it should come first
    if (a.playoff_rank !== null && b.playoff_rank === null) return -1;
    if (a.playoff_rank === null && b.playoff_rank !== null) return 1;
    
    // If neither has a playoff rank, fallback to sorting by match wins
    return b.match_wins - a.match_wins;
  });

  return (
    <div className="space-y-3 border-b pb-6 last:border-b-0">
      <div 
        className="flex justify-between items-center cursor-pointer bg-gray-50/50 dark:bg-gray-900/50 
          rounded-lg px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
            {divisionName}
            <span className="ml-2 text-gray-500 dark:text-gray-400 text-base font-normal">
              ({teams.length})
            </span>
          </h4>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="p-1 h-8 w-8 transition-transform duration-300" 
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronDown size={20} />
        </Button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-4">
              {champion && !isMobile && (
                <ChampionCard team={champion} />
              )}
              
              <HistoricalStandingsTable teams={sortedTeams} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DivisionPanel;
