
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bolt, Trophy, Scale, Star } from "lucide-react";
import { formatPowerScore } from "@/utils/colors";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatsSummaryCardsProps {
  rankings: Ranking[];
  theme?: string;
}

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

  // Improved styling for better mobile display
  const iconSize = isMobile ? 20 : 22; 
  const cardGap = isMobile ? 'gap-3 mb-3' : 'gap-4';
  const titleClass = "uppercase tracking-wide text-xs font-medium text-gray-700 dark:text-gray-300 font-inter";
  const statVal = `font-mono ${isMobile ? 'text-base sm:text-lg' : 'text-xl'} font-bold`;
  const descriptionClass = `text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-xs'} font-medium truncate max-w-[120px]`;

  // Color coding for highlight values
  const getColorFor = (type: string, value: number) => {
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
    if (type === "win" || type === "percentage") {
      if (value >= 75) return "text-green-600 dark:text-green-500";
      if (value >= 60) return "text-blue-500 dark:text-blue-400";
      if (value >= 40) return "text-orange-500 dark:text-orange-400";
      return "text-red-500 dark:text-red-400";
    }
    return "";
  };

  // Card style with subtle gradients
  const getCardStyle = (index: number) => {
    const baseStyle = "p-4 rounded-xl border shadow-sm";
    
    if (isLight) {
      const gradients = [
        "bg-gradient-to-br from-amber-50 to-amber-100",  // Trophy
        "bg-gradient-to-br from-green-50 to-green-100",  // Win %
        "bg-gradient-to-br from-blue-50 to-blue-100",    // SOS
        "bg-gradient-to-br from-purple-50 to-purple-100" // Power
      ];
      return `${baseStyle} ${gradients[index]}`;
    } else {
      return `${baseStyle} bg-gray-800/80 border-gray-700`;
    }
  };

  // Animation variants for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut" as const
      }
    })
  };

  return (
    <div className={`w-full grid ${isMobile ? 'grid-cols-1 xs:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} ${cardGap}`}>
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className={getCardStyle(0)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center bg-amber-500/15 rounded-full w-10 h-10`}>
            <Trophy size={iconSize} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className={titleClass}>Total Teams</h3>
            <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">
              {rankings ? rankings.length : 0}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className={getCardStyle(1)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center bg-green-500/15 rounded-full w-10 h-10`}>
            <Star size={iconSize} className="text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className={titleClass}>Highest Win %</h3>
            <p className={cn(statVal, getColorFor("percentage", Number(highestWinPercentage.percentage)))}>
              {highestWinPercentage.percentage}%
            </p>
            <p className={descriptionClass} title={highestWinPercentage.teamName}>{highestWinPercentage.teamName}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className={getCardStyle(2)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center bg-blue-500/15 rounded-full w-10 h-10`}>
            <Scale size={iconSize} className="text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className={titleClass}>Highest SOS</h3>
            <p className={cn(statVal, getColorFor("sos", Number(highestSOS.sos)))}>
              {highestSOS.sos}
            </p>
            <p className={descriptionClass} title={highestSOS.teamName}>{highestSOS.teamName}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className={getCardStyle(3)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center bg-purple-500/15 rounded-full w-10 h-10`}>
            <Bolt size={iconSize} className="text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className={titleClass}>Highest Power</h3>
            <p className={cn(statVal, getColorFor("power", Number(highestPowerScore.score)))}>
              {formatPowerScore(highestPowerScore.score)}
            </p>
            <p className={descriptionClass} title={highestPowerScore.teamName}>{highestPowerScore.teamName}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StatsSummaryCards;
