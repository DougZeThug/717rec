import React from "react";
import { Link } from "react-router-dom";
import { Star, TrendingUp, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WeeklyPowerScoreTrend } from "@/types/powerScoreSnapshot";
import { formatPowerScore } from "@/utils/colors/powerScoreColors";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { typeScale } from "@/styles/design-system";

interface TeamOfTheWeekCardProps {
  trend: WeeklyPowerScoreTrend;
  weekNumber: number;
}

const TeamOfTheWeekCard: React.FC<TeamOfTheWeekCardProps> = ({ trend, weekNumber }) => {
  return (
    <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10 opacity-50" />
      
      <CardContent className="relative p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Team of the Week
            </span>
          </div>
          <Badge variant="outline" className="text-xs border-muted-foreground/30">
            Week {weekNumber}
          </Badge>
        </div>

        <Link 
          to={`/teams/${trend.teamId}`}
          className="group block"
        >
          <div className="flex items-center gap-4 md:gap-6">
            {/* Team Logo with glow */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <TeamLogo 
                imageUrl={trend.logoUrl} 
                teamName={trend.teamName}
                size="lg"
                rounded
                className="relative z-10 ring-2 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all duration-300 !w-16 !h-16 !min-w-16 !min-h-16"
              />
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h3 className={cn(typeScale.h2, "text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate")}>
                {trend.teamName}
              </h3>
              <Badge variant="secondary" className={typeScale.caption}>
                {trend.division}
              </Badge>
            </div>

            {/* Power Score Delta */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-lg md:text-xl font-bold tabular-nums text-emerald-500">
                  +{trend.delta.toFixed(1)}
                </span>
              </div>
              <span className={cn(typeScale.caption, "tabular-nums")}>
                {formatPowerScore(trend.previousScore)} → {formatPowerScore(trend.currentScore)}
              </span>
              <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                +{trend.percentChange.toFixed(1)}%
              </span>
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-1 transition-all duration-200 hidden md:block" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};

export default TeamOfTheWeekCard;
