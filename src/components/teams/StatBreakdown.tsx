
import {
  Trophy,
  X,
  Percent,
  Activity,
  BarChartHorizontal,
  MessageSquareX,
  Star
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

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

  const StatItem = ({ 
    icon, 
    title, 
    value, 
    color 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: string | number;
    color?: string;
  }) => (
    <div className={`flex ${isMobile ? 'py-2' : 'p-3'}`}>
      <div className={`flex items-center justify-center mr-3 ${color || 'text-primary'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">📊 Stat Breakdown</h2>
      <Card>
        <CardContent className="pt-6">
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'} gap-2`}>
            <StatItem 
              icon={<Trophy size={18} />} 
              title="Match Record" 
              value={`${wins}–${losses}`}
              color="text-emerald-600"
            />
            <StatItem 
              icon={<Percent size={18} />} 
              title="Win Percentage" 
              value={`${winPercentage}%`} 
            />
            <StatItem 
              icon={<Activity size={18} />} 
              title="Game Record" 
              value={`${gamesWon}–${gamesLost}`} 
            />
            <StatItem 
              icon={<Percent size={18} />} 
              title="Game Win Percentage" 
              value={`${gameWinPercentage}%`} 
            />
            <StatItem 
              icon={<BarChartHorizontal size={18} />} 
              title="Strength of Schedule" 
              value={strengthOfSchedule} 
            />
            <StatItem 
              icon={<MessageSquareX size={18} />} 
              title="Close Match Losses" 
              value={closeMatchLosses}
              color="text-amber-600" 
            />
            <StatItem 
              icon={<Star size={18} />} 
              title="Power Score" 
              value={powerScore}
              color="text-violet-600" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatBreakdown;
