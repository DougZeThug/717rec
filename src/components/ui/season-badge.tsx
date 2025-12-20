import React from "react";
import { useSeasonWeek } from "@/hooks/useSeasonWeek";
import { cn } from "@/lib/utils";
import { ICON_SIZES, ICON_STROKE } from "@/styles/icon-system";

interface SeasonBadgeProps {
  className?: string;
}

/**
 * Subtle season branding badge showing current season and week number
 * Example: "❄️ Winter 2026 • Week 4"
 */
export const SeasonBadge: React.FC<SeasonBadgeProps> = ({ className }) => {
  const { seasonName, weekNumber, seasonIcon: SeasonIcon, isLoading } = useSeasonWeek();

  if (isLoading || !seasonName) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
        "bg-muted/50 border border-border/50",
        "text-xs font-medium text-muted-foreground",
        "transition-colors hover:bg-muted/70",
        className
      )}
    >
      <SeasonIcon 
        size={ICON_SIZES.sm} 
        strokeWidth={ICON_STROKE.normal}
        className="text-muted-foreground/80" 
      />
      <span>{seasonName}</span>
      {weekNumber !== null && (
        <>
          <span className="text-muted-foreground/50">•</span>
          <span>Week {weekNumber}</span>
        </>
      )}
    </div>
  );
};

export default SeasonBadge;
