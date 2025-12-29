import React from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bolt, Trophy, Scale, Star } from "lucide-react";
import { formatPowerScore } from "@/utils/colors";
import { cn } from "@/lib/utils";
import { SummaryCard } from "@/components/ui/summary-card";
import { listStyles } from "@/styles/design-system/lists";

interface StatsSummaryCardsProps {
  rankings: Ranking[];
  theme?: string;
}

const StatsSummaryCards = ({ rankings }: StatsSummaryCardsProps) => {
  const isMobile = useIsMobile();

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
  const highestSOS = getHighestSOS();
  const highestPowerScore = getHighestPowerScore();

  // Color coding for highlight values
  const getValueClass = (type: string, value: number) => {
    if (type === "power") {
      if (value >= 75) return "text-green-600 dark:text-green-500";
      if (value >= 60) return "text-blue-500 dark:text-blue-400";
      if (value >= 40) return "text-orange-500 dark:text-orange-400";
      return "text-red-500 dark:text-red-400";
    }
    if (type === "sos") {
      if (value >= 0.75) return "text-green-600 dark:text-green-500";
      if (value >= 0.60) return "text-blue-500 dark:text-blue-400";
      if (value >= 0.40) return "text-orange-500 dark:text-orange-400";
      return "text-red-500 dark:text-red-400";
    }
    if (type === "percentage") {
      if (value >= 75) return "text-green-600 dark:text-green-500";
      if (value >= 60) return "text-blue-500 dark:text-blue-400";
      if (value >= 40) return "text-orange-500 dark:text-orange-400";
      return "text-red-500 dark:text-red-400";
    }
    return "";
  };

  return (
    <div className={cn("w-full mb-3 md:mb-4", listStyles.grid.stats)}>
      <SummaryCard
        icon={Trophy}
        iconColor="text-amber-500"
        iconBgColor="bg-amber-500/15"
        title="Total Teams"
        value={rankings ? rankings.length : 0}
        gradient="amber"
        index={0}
      />

      <SummaryCard
        icon={Star}
        iconColor="text-green-500"
        iconBgColor="bg-green-500/15"
        title="Highest Win %"
        value={
          <span className={getValueClass("percentage", Number(highestWinPercentage.percentage))}>
            {highestWinPercentage.percentage}%
          </span>
        }
        description={highestWinPercentage.teamName}
        gradient="green"
        index={1}
      />

      <SummaryCard
        icon={Scale}
        iconColor="text-blue-500"
        iconBgColor="bg-blue-500/15"
        title="Highest SOS"
        value={
          <span className={getValueClass("sos", Number(highestSOS.sos))}>
            {highestSOS.sos}
          </span>
        }
        description={highestSOS.teamName}
        gradient="blue"
        index={2}
      />

      <SummaryCard
        icon={Bolt}
        iconColor="text-purple-500"
        iconBgColor="bg-purple-500/15"
        title="Highest Power"
        value={
          <span className={getValueClass("power", Number(highestPowerScore.score))}>
            {formatPowerScore(highestPowerScore.score)}
          </span>
        }
        description={highestPowerScore.teamName}
        gradient="purple"
        index={3}
      />
    </div>
  );
};

export default StatsSummaryCards;
