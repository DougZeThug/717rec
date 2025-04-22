import {
  Trophy,
  Percent,
  BarChart2,
  ShieldAlert,
  Star,
  Award,
  Activity
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
  rank?: number;
  totalTeams?: number;
  rankChange?: number;
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
  powerScore,
  rank,
  totalTeams,
  rankChange
}: StatBreakdownProps) => {
  const isMobile = useIsMobile();

  const getPowerScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getWinPercentageColor = (percentage: string) => {
    const value = parseFloat(percentage);
    if (value >= 75) return "text-emerald-600";
    if (value >= 50) return "text-blue-600";
    if (value >= 35) return "text-amber-600";
    return "text-red-600";
  };

  const renderRankChange = () => {
    if (!rankChange) return null;
    if (rankChange > 0) {
      return (
        <span className="text-green-500 text-sm font-medium inline-flex items-center ml-2">
          ▲ Up {rankChange} {rankChange === 1 ? 'spot' : 'spots'}
        </span>
      );
    } else if (rankChange < 0) {
      return (
        <span className="text-red-500 text-sm font-medium inline-flex items-center ml-2">
          ▼ Down {Math.abs(rankChange)} {Math.abs(rankChange) === 1 ? 'spot' : 'spots'}
        </span>
      );
    }
    return null;
  };

  const labelClass = "font-inter uppercase text-xs sm:text-sm tracking-widest text-muted-foreground";
  const statClass = "font-mono text-base text-gray-800 dark:text-white";
  const statHighlight = "text-xl sm:text-2xl";

  const StatItem = ({
    icon,
    title,
    value,
    color,
    isHighlighted = false,
    ariaLabel
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    color?: string;
    isHighlighted?: boolean;
    ariaLabel?: string;
  }) => (
    <div 
      className={cn(
        "flex rounded-lg transition-all",
        isMobile ? 'py-3 px-2' : 'p-4',
        isHighlighted && "bg-slate-50 dark:bg-slate-800/30 shadow-sm"
      )}
      aria-label={ariaLabel}
    >
      <div className={cn("flex items-center justify-center mr-3", color || "text-slate-600")}>
        {icon}
      </div>
      <dl>
        <dt className={labelClass}>{title}</dt>
        <dd className={cn(
          statClass,
          isHighlighted && statHighlight,
          !isMobile && "text-center"
        )}>{value}</dd>
      </dl>
    </div>
  );

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold inline-flex items-center">
          <Activity size={24} className="mr-2" /> Stat Breakdown
        </h2>
        {rank && totalTeams && (
          <div className="mt-1 flex items-center">
            <span className="text-sm font-medium">
              Ranked #{rank} of {totalTeams}
            </span>
            {renderRankChange()}
          </div>
        )}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-2 md:grid-cols-3 gap-4'}`}>
            <StatItem 
              icon={<Trophy size={20} />} 
              title="Match Record" 
              value={`${wins}–${losses}`}
              color="text-amber-500"
              isHighlighted
              ariaLabel={`Match Record: ${wins} wins and ${losses} losses`}
            />
            <StatItem 
              icon={<Percent size={20} />} 
              title="Match Win %" 
              value={`${winPercentage}%`}
              color={getWinPercentageColor(winPercentage)}
              ariaLabel={`Match Win Percentage: ${winPercentage}%`}
            />
            <StatItem 
              icon={<BarChart2 size={20} />} 
              title="Game Record" 
              value={`${gamesWon}–${gamesLost}`}
              color="text-blue-500"
              isHighlighted
              ariaLabel={`Game Record: ${gamesWon} games won and ${gamesLost} games lost`}
            />
            <StatItem 
              icon={<Percent size={20} />} 
              title="Game Win %" 
              value={`${gameWinPercentage}%`}
              color={getWinPercentageColor(gameWinPercentage)}
              ariaLabel={`Game Win Percentage: ${gameWinPercentage}%`}
            />
            <StatItem 
              icon={<Award size={20} />} 
              title="Strength of Schedule" 
              value={strengthOfSchedule}
              color="text-indigo-500"
              ariaLabel={`Strength of Schedule: ${strengthOfSchedule}`}
            />
            <StatItem 
              icon={<ShieldAlert size={20} />} 
              title="Close Match Losses" 
              value={closeMatchLosses}
              color="text-orange-500"
              ariaLabel={`Close Match Losses: ${closeMatchLosses}`}
            />
            <StatItem 
              icon={<Star size={20} className={getPowerScoreColor(powerScore)} />} 
              title="Power Score" 
              value={Number(powerScore).toFixed(1)}
              color={getPowerScoreColor(powerScore)}
              isHighlighted
              ariaLabel={`Power Score: ${Number(powerScore).toFixed(1)}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatBreakdown;
