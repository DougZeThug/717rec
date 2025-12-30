import React from "react";
import { Link } from "react-router";
import { Match } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { ICON_SIZES, ICON_STROKE } from "@/styles/icon-system";

interface LastMatchHighlightProps {
  teamId: string;
  pastMatches: Match[];
  className?: string;
}

/**
 * Compact display of the team's most recent match result
 * Example: "Last match: W 21-17 vs Off Dogs"
 */
export const LastMatchHighlight: React.FC<LastMatchHighlightProps> = ({
  teamId,
  pastMatches,
  className,
}) => {
  // Get the most recent completed match
  const lastMatch = pastMatches.length > 0 
    ? pastMatches[pastMatches.length - 1] 
    : null;

  if (!lastMatch) {
    return null;
  }

  // Determine if this team won
  const isWin = lastMatch.winnerId === teamId;
  const isTeam1 = lastMatch.team1Id === teamId;
  
  // Get opponent info
  const opponentId = isTeam1 ? lastMatch.team2Id : lastMatch.team1Id;
  const opponentDetails = isTeam1 ? lastMatch.team2Details : lastMatch.team1Details;
  const opponentName = opponentDetails?.name || "Unknown";
  
  // Get scores
  const teamScore = isTeam1 ? lastMatch.team1Score : lastMatch.team2Score;
  const opponentScore = isTeam1 ? lastMatch.team2Score : lastMatch.team1Score;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="opacity-70">Last match:</span>
      <span
        className={cn(
          "font-semibold",
          isWin ? "text-green-500" : "text-red-500"
        )}
      >
        {isWin ? "W" : "L"}
      </span>
      <span className="font-medium">
        {teamScore ?? 0}-{opponentScore ?? 0}
      </span>
      <span className="opacity-70">vs</span>
      <Link
        to={`/teams/${opponentId}`}
        className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5"
      >
        {opponentName}
        <ChevronRight 
          size={ICON_SIZES.xs} 
          strokeWidth={ICON_STROKE.normal}
          className="opacity-50" 
        />
      </Link>
    </div>
  );
};

export default LastMatchHighlight;
