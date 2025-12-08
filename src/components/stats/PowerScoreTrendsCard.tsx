import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePowerScoreTrends } from "@/hooks/usePowerScoreTrends";
import { useWeeklyPowerScoreTrends } from "@/hooks/useWeeklyPowerScoreTrends";
import { TrendDirection } from "@/types/powerScoreTrends";
import { getTrendColor, getTrendArrow } from "@/utils/colors/trendColors";
import { getPowerScoreColor } from "@/utils/colors/powerScoreColors";
import { TrendingUp, TrendingDown, Calendar, CalendarDays } from "lucide-react";

type ViewMode = 'weekly' | 'seasonal';

const PowerScoreTrendsCard: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const [direction, setDirection] = useState<TrendDirection>('up');
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  
  const { data: seasonalTrends, isLoading: seasonalLoading } = usePowerScoreTrends(direction, 10);
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyPowerScoreTrends(direction, 10);

  const isLoading = viewMode === 'weekly' ? weeklyLoading : seasonalLoading;
  const trends = viewMode === 'weekly' ? weeklyData?.trends : seasonalTrends;
  const hasWeeklyData = weeklyData?.hasData && weeklyData?.trends && weeklyData.trends.length > 0;

  const getDescription = () => {
    if (viewMode === 'weekly') {
      if (weeklyData?.trends && weeklyData.trends.length > 0) {
        const { currentWeek, previousWeek } = weeklyData.trends[0];
        return `Week ${previousWeek} → Week ${currentWeek} changes`;
      }
      return 'Week-over-week performance changes';
    }
    return 'Season-over-season performance changes';
  };

  return (
    <Card className={cn(
      "bg-white text-[#1a1a1a] border border-[#e0e0e0] dark:bg-[#20232A] dark:border-0 dark:text-white rounded-xl shadow-sm",
      animations.fadeInSlideUp,
      "animation-delay-300"
    )}>
      <CardHeader className={cn(
        "rounded-t-xl",
        isMobile ? "pb-2 py-3" : "pb-3"
      )}
        style={resolvedTheme === "light" ? { borderBottom: "1px solid #e0e0e0", borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff" } : {}}>
        <CardTitle
          className={cn(
            "font-semibold font-inter tracking-wide text-gray-800 dark:text-white uppercase",
            isMobile ? "text-base" : "text-lg"
          )}
          style={{ letterSpacing: ".03em" }}
        >
          Power Score Trends
        </CardTitle>
        <CardDescription
          className={cn(
            "text-gray-600 dark:text-gray-300 font-inter",
            isMobile ? "text-xs" : "text-sm"
          )}
        >
          {getDescription()}
        </CardDescription>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setViewMode('weekly')}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors",
              "flex items-center justify-center gap-1.5",
              viewMode === 'weekly'
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Calendar className="h-4 w-4" />
            Weekly
          </button>
          <button
            onClick={() => setViewMode('seasonal')}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors",
              "flex items-center justify-center gap-1.5",
              viewMode === 'seasonal'
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Seasonal
          </button>
        </div>

        {/* Direction Toggle */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setDirection('up')}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors",
              "flex items-center justify-center gap-1.5",
              direction === 'up'
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Trending Up
          </button>
          <button
            onClick={() => setDirection('down')}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors",
              "flex items-center justify-center gap-1.5",
              direction === 'down'
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <TrendingDown className="h-4 w-4" />
            Trending Down
          </button>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? "p-2 pt-2" : "p-4 pt-3"}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading trends...</div>
          </div>
        ) : viewMode === 'weekly' && !hasWeeklyData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
            <div className="text-muted-foreground text-sm">
              {weeklyData?.hasData 
                ? "Need at least 2 weeks of snapshots to show trends."
                : "No weekly snapshots captured yet."}
            </div>
            <div className="text-muted-foreground text-xs mt-1">
              Snapshots are captured every Thursday at 11pm EST.
            </div>
          </div>
        ) : trends && trends.length > 0 ? (
          <div className="space-y-2">
            {trends.map((trend, index) => (
              <div
                key={trend.teamId}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg",
                  "bg-muted/30 hover:bg-muted/50 transition-colors"
                )}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-6 text-center">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                </div>

                {/* Team Logo */}
                {trend.logoUrl && (
                  <img
                    src={trend.logoUrl}
                    alt={trend.teamName}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                )}

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {trend.teamName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {trend.division}
                  </div>
                </div>

                {/* Current Score */}
                <div className="text-right">
                  <div className={cn("text-sm font-mono font-semibold", getPowerScoreColor(trend.currentScore))}>
                    {trend.currentScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    current
                  </div>
                </div>

                {/* Delta */}
                <div className="text-right flex-shrink-0 min-w-[60px]">
                  <div className={cn("text-sm font-mono font-bold", getTrendColor(trend.delta))}>
                    {getTrendArrow(trend.delta)} {trend.delta >= 0 ? '+' : ''}{trend.delta.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    change
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground text-sm">
              {viewMode === 'weekly' 
                ? "No weekly trend data available yet."
                : "No trend data available. Teams need at least two seasons of data."}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PowerScoreTrendsCard;
