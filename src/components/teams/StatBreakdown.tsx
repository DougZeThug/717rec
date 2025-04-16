
import {
  Trophy,
  Percent,
  BarChart2,
  ShieldAlert,
  Star,
  Award
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
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
}

const StatBreakdown = ({
  wins,
  losses,
  winPercentage,
  gamesWon,
  gamesLost,
  gameWinPercentage,
  strengthOfSchedule,
  closeMatchLosses,
  powerScore
}: StatBreakdownProps) => {
  const isMobile = useIsMobile();

  // Determine the power score color based on value
  const getPowerScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 45) return "text-amber-600";
    return "text-red-600";
  };
  
  // Get win percentage color
  const getWinPercentageColor = (percentage: string) => {
    const value = parseFloat(percentage);
    if (value >= 75) return "text-emerald-600";
    if (value >= 50) return "text-blue-600";
    if (value >= 35) return "text-amber-600";
    return "text-red-600";
  };

  const StatItem = ({ 
    icon, 
    title, 
    value, 
    color,
    isHighlighted = false
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: string | number;
    color?: string;
    isHighlighted?: boolean;
  }) => (
    <div className={cn(
      `flex rounded-lg transition-all ${isMobile ? 'py-3 px-2' : 'p-4'}`,
      isHighlighted && "bg-slate-50 dark:bg-slate-800/30 shadow-sm"
    )}>
      <div className={cn("flex items-center justify-center mr-3", color || "text-slate-600")}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className={cn(
          "text-lg font-semibold",
          isHighlighted && "text-xl"
        )}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">📊 Stat Breakdown</h2>
      <Card>
        <CardContent className="pt-6">
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2'}`}>
            <StatItem 
              icon={<Trophy size={20} />} 
              title="Match Record" 
              value={`${wins}–${losses}`}
              color="text-amber-500"
            />
            <StatItem 
              icon={<Percent size={20} />} 
              title="Win Percentage" 
              value={`${winPercentage}%`}
              color={getWinPercentageColor(winPercentage)}
              isHighlighted
            />
            <StatItem 
              icon={<BarChart2 size={20} />} 
              title="Game Record" 
              value={`${gamesWon}–${gamesLost}`}
              color="text-blue-500"
            />
            <StatItem 
              icon={<Percent size={20} />} 
              title="Game Win Percentage" 
              value={`${gameWinPercentage}%`}
              color={getWinPercentageColor(gameWinPercentage)}
            />
            <StatItem 
              icon={<Award size={20} />} 
              title="Strength of Schedule" 
              value={strengthOfSchedule}
              color="text-indigo-500"
            />
            <StatItem 
              icon={<ShieldAlert size={20} />} 
              title="Close Match Losses" 
              value={closeMatchLosses}
              color="text-orange-500"
            />
            <StatItem 
              icon={<Star size={20} />} 
              title="Power Score" 
              value={powerScore}
              color={getPowerScoreColor(powerScore)}
              isHighlighted
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatBreakdown;
