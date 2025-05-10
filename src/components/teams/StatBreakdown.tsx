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
import { gradients } from "@/styles/design-system";

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
  const [activeTab, setActiveTab] = useState("core");
  
  // Get appropriate color classes
  const powerScoreColorClass = getPowerScoreColor(powerScore);
  const sosColorClass = getSosColor(sos);
  
  // Card gradient based on active tab with orange accent
  const getTabGradient = (tabName: string) => {
    return tabName === activeTab 
      ? (isLight ? "bg-white border-b-2 border-orange-400/80" : "bg-black/30 border-b-2 border-orange-400/50") 
      : (isLight ? "bg-gray-50/80" : "bg-black/10");
  };
  
  return (
    <Card className="p-5 mb-6 overflow-hidden" variant="elevated">
      <h2 className="text-xl font-semibold mb-4 font-oswald uppercase tracking-wider">Team Stats</h2>
      
      <Tabs 
        defaultValue="core" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger 
            value="core" 
            className={cn(
              "text-sm transition-all duration-300",
              getTabGradient("core")
            )}
          >
            Core
          </TabsTrigger>
          <TabsTrigger 
            value="games" 
            className={cn(
              "text-sm transition-all duration-300",
              getTabGradient("games")
            )}
          >
            Game
          </TabsTrigger>
          <TabsTrigger 
            value="advanced" 
            className={cn(
              "text-sm transition-all duration-300",
              getTabGradient("advanced")
            )}
          >
            Advanced
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
              gradient="bg-gradient-to-br from-white to-orange-50/50 dark:from-gray-800/90 dark:to-gray-900/70"
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
                gradient="bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800/90 dark:to-gray-900/70"
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
              gradient="bg-gradient-to-br from-white to-green-50/50 dark:from-gray-800/90 dark:to-gray-900/70"
              icon={<Trophy size={18} className="text-emerald-500" />}
            />
            
            {/* Win Percentage */}
            <StatBlock 
              label="Win Percentage" 
              value={`${winPercentage}%`}
              gradient="bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 dark:from-gray-800/90 dark:to-gray-900/70"
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
              gradient="bg-gradient-to-br from-white to-indigo-50/40 dark:from-gray-800/90 dark:to-gray-900/70"
              icon={<Users size={18} className="text-indigo-500" />}
            />
            
            {/* Game Win Percentage */}
            <StatBlock 
              label="Game Win Percentage" 
              value={`${gameWinPercentage}%`}
              gradient="bg-gradient-to-br from-white to-teal-50/30 dark:from-gray-800/90 dark:to-gray-900/70"
              icon={<Target size={18} className="text-teal-500" />}
            />
            
            {/* Close Match Losses */}
            <StatBlock 
              label="Close Match Losses" 
              value={closeMatchLosses}
              gradient="bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800/90 dark:to-gray-900/70"
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
              gradient="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800/90 dark:to-gray-900/70"
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
                    gradient="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800/90 dark:to-gray-900/70"
                  />
                  <StatBlock 
                    label="Game Win-Loss Ratio" 
                    value={(gamesWon / (gamesLost || 1)).toFixed(2)} 
                    orientation="horizontal"
                    gradient="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800/90 dark:to-gray-900/70"
                  />
                  <StatBlock 
                    label="Total Matches" 
                    value={wins + losses} 
                    orientation="horizontal"
                    gradient="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800/90 dark:to-gray-900/70"
                  />
                  <StatBlock 
                    label="Total Games" 
                    value={gamesWon + gamesLost} 
                    orientation="horizontal"
                    gradient="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800/90 dark:to-gray-900/70"
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
