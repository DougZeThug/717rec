import { useTeamCareerPowerScore } from "@/hooks/useTeamCareerPowerScore";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import { getDivisionHexColor } from "@/utils/colors/divisionHexColors";
import { SeasonPowerScoreData } from "@/types/teamCareerPowerScore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  DotProps
} from "recharts";
import { TrendingUp, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TeamCareerPowerScoreChartProps {
  teamId: string;
}

const CustomDot = (props: DotProps & { payload?: SeasonPowerScoreData }) => {
  const { cx, cy, payload } = props;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!payload || payload.powerScore === null || cx === undefined || cy === undefined) {
    return null;
  }

  const color = getDivisionHexColor(payload.divisionName, isDark);

  return (
    <g>
      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke="white"
        strokeWidth={2}
      />
      {/* Top 3 badge */}
      {payload.isTop3 && (
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          opacity={0.6}
        />
      )}
    </g>
  );
};

const CustomLabel = (props: any) => {
  const { x, y, value, payload } = props;

  if (!payload || payload.playoffRank === null) {
    return null;
  }

  let icon = null;
  if (payload.isChampion) {
    icon = '🏆';
  } else if (payload.isRunnerUp) {
    icon = '🥈';
  } else if (payload.playoffRank === 3) {
    icon = '🥉';
  }

  return (
    <text
      x={x}
      y={y - 12}
      textAnchor="middle"
      fill="currentColor"
      className="text-xs font-semibold"
    >
      {icon || `${payload.playoffRank}th`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!active || !payload || !payload[0]) return null;

  const data: SeasonPowerScoreData = payload[0].payload;

  let placementText = '';
  if (data.isChampion) {
    placementText = '🏆 Champion';
  } else if (data.isRunnerUp) {
    placementText = '🥈 Runner-up';
  } else if (data.playoffRank === 3) {
    placementText = '🥉 3rd Place';
  } else if (data.playoffRank && data.playoffRank > 3) {
    placementText = `${data.playoffRank}th Place`;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-sm mb-1">{data.seasonName}</p>
      {data.powerScore !== null && (
        <p className="text-sm">
          Power Score: <span className="font-bold">{data.powerScore.toFixed(1)}</span>
        </p>
      )}
      {data.divisionName && (
        <p className="text-xs text-muted-foreground">
          Division: {data.divisionName}
        </p>
      )}
      {placementText && (
        <p className="text-xs font-medium mt-1">{placementText}</p>
      )}
    </div>
  );
};

const TeamCareerPowerScoreChart = ({ teamId }: TeamCareerPowerScoreChartProps) => {
  const { data: seasonData, isLoading } = useTeamCareerPowerScore(teamId);
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="border rounded-lg bg-card shadow-sm p-4 md:p-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!seasonData || seasonData.length === 0) {
    return null; // Don't show chart if no season data
  }

  const chartHeight = isMobile ? 250 : 300;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card shadow-sm">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
              Career Power Score Trend
            </h2>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-3 md:p-4 pt-0 border-t">
            <div className="pt-3">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart
                  data={seasonData}
                  margin={{ top: 20, right: 30, left: 0, bottom: isMobile ? 60 : 20 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark ? '#374151' : '#e5e7eb'}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="seasonName"
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? 'end' : 'middle'}
                    height={isMobile ? 80 : 30}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    stroke="currentColor"
                  />
                  <YAxis
                    domain={[0, 100]}
                    label={{ 
                      value: 'Power Score', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fontSize: 12, fill: 'currentColor' }
                    }}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    stroke="currentColor"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="powerScore"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={<CustomDot />}
                    label={<CustomLabel />}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Division legend */}
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getDivisionHexColor('Competitive', isDark) }} />
                  <span>Competitive</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getDivisionHexColor('Intermediate', isDark) }} />
                  <span>Intermediate</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getDivisionHexColor('Recreational', isDark) }} />
                  <span>Recreational</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default TeamCareerPowerScoreChart;
