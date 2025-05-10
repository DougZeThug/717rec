
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatBlock } from "@/components/teams/shared/StatBlock";
import { 
  Medal, 
  Trophy, 
  X, 
  Target, 
  Scale, 
  Zap, 
  GitBranch, 
  Users 
} from "lucide-react";
import { formatPowerScore, getPowerScoreColor, getSosColor } from "@/utils/colors";
import RankTrendIndicator from "@/components/stats/RankTrendIndicator";
import { useTheme } from "next-themes";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface StatBreakdownProps {
  wins: number;
  losses: number;
  winPercentage: string;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: string;
  strengthOfSchedule: string;
  closeMatchLosses: number;
  powerScore: number;
  rank?: number;
  totalTeams?: number;
  rankChange?: number;
}

const StatBreakdown: React.FC<StatBreakdownProps> = ({
  wins,
  losses,
  winPercentage,
  gamesWon,
  gamesLost,
  gameWinPercentage,
  strengthOfSchedule,
  closeMatchLosses,
  powerScore,
  rank,
  totalTeams,
  rankChange
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const sos = parseFloat(strengthOfSchedule);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Get appropriate color classes
  const powerScoreColorClass = getPowerScoreColor(powerScore);
  const sosColorClass = getSosColor(sos);
  
  return (
    <Card className="p-5 mb-6">
      <h2 className="text-xl font-semibold mb-4 font-oswald uppercase tracking-wider">Team Stats</h2>
      
      <Tabs defaultValue="core" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="core" className="text-sm">
            Core Stats
          </TabsTrigger>
          <TabsTrigger value="games" className="text-sm">
            Game Stats
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-sm">
            Advanced Stats
          </TabsTrigger>
        </TabsList>
        
        {/* Core Stats Tab */}
        <TabsContent value="core" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Power Score */}
            <StatBlock 
              label="Power Score" 
              value={
                <span className={powerScoreColorClass}>
                  {formatPowerScore(powerScore)}
                </span>
              }
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Zap size={18} className="text-amber-500" />}
            />
            
            {/* Ranking */}
            {rank && (
              <StatBlock 
                label="Ranking" 
                value={
                  <div className="flex items-center justify-center gap-2">
                    <span>{rank}{totalTeams ? `/${totalTeams}` : ''}</span>
                    {rankChange !== undefined && <RankTrendIndicator rankChange={rankChange} />}
                  </div>
                }
                className="bg-[#f9f9f9] dark:bg-black/30"
                icon={<Medal size={18} className="text-blue-500" />}
              />
            )}
            
            {/* Match Record */}
            <StatBlock 
              label="Match Record" 
              value={
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center text-green-500">
                    <Trophy size={16} className="mr-1" />
                    <span>{wins}</span>
                  </div>
                  <div className="flex items-center text-red-500">
                    <X size={16} className="mr-1" />
                    <span>{losses}</span>
                  </div>
                </div>
              }
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Trophy size={18} className="text-emerald-500" />}
            />
            
            {/* Win Percentage */}
            <StatBlock 
              label="Win Percentage" 
              value={`${winPercentage}%`}
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Target size={18} className="text-purple-500" />}
            />
          </div>
        </TabsContent>
        
        {/* Game Stats Tab */}
        <TabsContent value="games" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Game Record */}
            <StatBlock 
              label="Game Record" 
              value={
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center text-green-500">
                    <Trophy size={16} className="mr-1" />
                    <span>{gamesWon}</span>
                  </div>
                  <div className="flex items-center text-red-500">
                    <X size={16} className="mr-1" />
                    <span>{gamesLost}</span>
                  </div>
                </div>
              }
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Users size={18} className="text-indigo-500" />}
            />
            
            {/* Game Win Percentage */}
            <StatBlock 
              label="Game Win Percentage" 
              value={`${gameWinPercentage}%`}
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Target size={18} className="text-teal-500" />}
            />
            
            {/* Close Match Losses */}
            <StatBlock 
              label="Close Match Losses" 
              value={closeMatchLosses}
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<GitBranch size={18} className="text-orange-500" />}
            />
          </div>
        </TabsContent>
        
        {/* Advanced Stats Tab */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Strength of Schedule */}
            <StatBlock 
              label="Strength of Schedule" 
              value={
                <span className={!isLight ? sosColorClass : ''}
                  style={{ 
                    color: isLight ? (
                      sos >= 0.875 ? '#b91c1c' :  // red-700
                      sos >= 0.750 ? '#ef4444' :  // red-500
                      sos >= 0.550 ? '#f97316' :  // orange-500
                      '#16a34a'  // green-600
                    ) : undefined 
                  }}>
                  {strengthOfSchedule}
                </span>
              }
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Scale size={18} className="text-blue-500" />}
            />
            
            {/* Detailed Stats Collapsible Section */}
            <Collapsible 
              open={isAdvancedOpen} 
              onOpenChange={setIsAdvancedOpen}
              className="col-span-1 md:col-span-2"
            >
              <CollapsibleTrigger className="flex items-center justify-center w-full py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                {isAdvancedOpen ? "Hide Detailed Stats" : "Show Detailed Stats"}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <StatBlock 
                    label="Win-Loss Ratio" 
                    value={(wins / (losses || 1)).toFixed(2)} 
                    orientation="horizontal"
                    className="bg-[#f9f9f9] dark:bg-black/30"
                  />
                  <StatBlock 
                    label="Game Win-Loss Ratio" 
                    value={(gamesWon / (gamesLost || 1)).toFixed(2)} 
                    orientation="horizontal"
                    className="bg-[#f9f9f9] dark:bg-black/30"
                  />
                  <StatBlock 
                    label="Total Matches" 
                    value={wins + losses} 
                    orientation="horizontal"
                    className="bg-[#f9f9f9] dark:bg-black/30"
                  />
                  <StatBlock 
                    label="Total Games" 
                    value={gamesWon + gamesLost} 
                    orientation="horizontal"
                    className="bg-[#f9f9f9] dark:bg-black/30"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default StatBreakdown;
