
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bolt, Trophy, Scale, Star } from "lucide-react";
import { formatPowerScore } from "@/utils/powerScore";
import { useTheme } from "next-themes";

interface StatsSummaryCardsProps {
  rankings: Ranking[];
  theme?: string;
}

const iconSize = 18; // Slightly smaller for tighter grid

const StatsSummaryCards = ({ rankings, theme }: StatsSummaryCardsProps) => {
  const isMobile = useIsMobile();
  const { theme: currentTheme } = useTheme();
  const isLight = currentTheme === "light" || theme === "light";

  const getHighestWinPercentage = () => {
    if (!rankings || rankings.length === 0) return { percentage: 0, teamName: 'No teams' };
    const highest = rankings.reduce((max, team) =>
      (team.winPercentage > max.winPercentage) ? team : max, rankings[0]);
    return {
      percentage: highest ? (highest.winPercentage * 100).toFixed(1) : 0,
      teamName: highest?.teamName || 'No teams'
    };
  };

  const getMostWins = () => {
    if (!rankings || rankings.length === 0) return { wins: 0, teamName: 'No teams' };
    const mostWinsTeam = rankings.reduce((maxTeam, team) =>
      ((team.wins || 0) > (maxTeam.wins || 0)) ? team : maxTeam, rankings[0]);
    return {
      wins: mostWinsTeam ? mostWinsTeam.wins : 0,
      teamName: mostWinsTeam?.teamName || 'No teams'
    };
  };

  const getHighestSOS = () => {
    if (!rankings || rankings.length === 0) return { sos: 0, teamName: 'No teams' };
    const highestSOS = rankings.reduce((max, team) =>
      ((team.sos || 0) > (max.sos || 0)) ? team : max, rankings[0]);
    return {
      sos: highestSOS && highestSOS.sos ? highestSOS.sos.toFixed(3) : 0,
      teamName: highestSOS?.teamName || 'No teams'
    };
  };

  const getHighestPowerScore = () => {
    if (!rankings || rankings.length === 0) return { score: 0, teamName: 'No teams' };
    const highest = rankings.reduce((max, team) =>
      ((team.powerScore || 0) > (max.powerScore || 0)) ? team : max, rankings[0]);
    return {
      score: highest?.powerScore || 0,
      teamName: highest?.teamName || 'No teams'
    };
  };

  const highestWinPercentage = getHighestWinPercentage();
  const mostWins = getMostWins();
  const highestSOS = getHighestSOS();
  const highestPowerScore = getHighestPowerScore();

  // Update: bg-muted card style, gap-2 or gap-3, even tighter padding
  const cardBase = "flex flex-row items-center gap-2 sm:gap-3 py-3 px-2 sm:px-3 rounded-xl font-inter shadow-sm bg-muted border";
  const titleLabel = "uppercase tracking-widest text-xs font-medium text-gray-700 dark:text-gray-300 font-inter";
  const statVal = "font-mono text-lg sm:text-xl font-extrabold";
  const descriptionColor = "text-gray-500 dark:text-gray-400 text-xs font-medium";

  // Color coding for highlight values
  const getColorFor = (type: string, value: number) => {
    if (type === "power") {
      if (value >= 75) return "text-green-600";
      if (value >= 60) return "text-blue-500";
      if (value >= 40) return "text-orange-500";
      return "text-red-500";
    }
    if (type === "sos") {
      if (value >= 75) return "text-green-600";
      if (value >= 60) return "text-blue-500";
      if (value >= 40) return "text-orange-500";
      return "text-red-500";
    }
    if (type === "win" || type === "percentage") {
      if (value >= 75) return "text-green-600";
      if (value >= 60) return "text-blue-500";
      if (value >= 40) return "text-orange-500";
      return "text-red-500";
    }
    return "";
  };

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      <Card className={cardBase}>
        <div className="flex items-center justify-center bg-cornhole-green/15 rounded-full w-9 h-9 mr-2">
          <Trophy size={iconSize} className="text-amber-500" />
        </div>
        <div>
          <CardTitle className={titleLabel}>Total Teams</CardTitle>
          <div className="font-mono text-lg font-extrabold text-cornhole-green">{rankings ? rankings.length : 0}</div>
        </div>
      </Card>
      <Card className={cardBase}>
        <div className="flex items-center justify-center bg-green-900/15 rounded-full w-9 h-9 mr-2">
          <Star size={iconSize} className="text-green-400" />
        </div>
        <div>
          <CardTitle className={titleLabel}>Highest Win %</CardTitle>
          <div className={`${statVal} ${getColorFor("percentage", Number(highestWinPercentage.percentage))}`}>
            {highestWinPercentage.percentage}%
          </div>
          <div className={descriptionColor}>{highestWinPercentage.teamName}</div>
        </div>
      </Card>
      <Card className={cardBase}>
        <div className="flex items-center justify-center bg-blue-900/15 rounded-full w-9 h-9 mr-2">
          <Scale size={iconSize} className="text-blue-400" />
        </div>
        <div>
          <CardTitle className={titleLabel}>Highest SOS</CardTitle>
          <div className={`${statVal} ${getColorFor("sos", Number(highestSOS.sos))}`}>
            {highestSOS.sos}
          </div>
          <div className={descriptionColor}>{highestSOS.teamName}</div>
        </div>
      </Card>
      <Card className={cardBase}>
        <div className="flex items-center justify-center bg-purple-900/20 rounded-full w-9 h-9 mr-2">
          <Bolt size={iconSize} className="text-purple-300" />
        </div>
        <div>
          <CardTitle className={titleLabel}>Highest Power Score</CardTitle>
          <div className={`${statVal} ${getColorFor("power", Number(highestPowerScore.score))}`}>
            {formatPowerScore(highestPowerScore.score)}
          </div>
          <div className={descriptionColor}>{highestPowerScore.teamName}</div>
        </div>
      </Card>
    </div>
  );
};

export default StatsSummaryCards;
