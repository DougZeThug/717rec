
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bolt, Trophy, Scale, Star } from "lucide-react"; // Changed LightningBolt to Bolt
import { formatPowerScore } from "@/utils/powerScore";

interface StatsSummaryCardsProps {
  rankings: Ranking[];
}

const iconSize = 22;

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
  const mostWins = getMostWins();
  const highestSOS = getHighestSOS();
  const highestPowerScore = getHighestPowerScore();

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="flex flex-row items-center gap-3 py-3 bg-[#1E1E1E] rounded-xl shadow font-inter">
        <div className="flex items-center justify-center bg-cornhole-green/15 rounded-full w-12 h-12 mr-2">
          <Trophy size={iconSize} className="text-amber-500" />
        </div>
        <div>
          <CardTitle className="text-base font-bold text-white mb-0">Total Teams</CardTitle>
          <div className="font-extrabold text-xl text-cornhole-green">{rankings ? rankings.length : 0}</div>
        </div>
      </Card>
      <Card className="flex flex-row items-center gap-3 py-3 bg-[#1E1E1E] rounded-xl shadow font-inter">
        <div className="flex items-center justify-center bg-green-900/15 rounded-full w-12 h-12 mr-2">
          <Star size={iconSize} className="text-green-400" />
        </div>
        <div>
          <CardTitle className="text-base font-bold text-white mb-0">Highest Win %</CardTitle>
          <div className="font-extrabold text-xl text-green-300">{highestWinPercentage.percentage}%</div>
          <div className="text-xs text-gray-400 font-light">{highestWinPercentage.teamName}</div>
        </div>
      </Card>
      <Card className="flex flex-row items-center gap-3 py-3 bg-[#1E1E1E] rounded-xl shadow font-inter">
        <div className="flex items-center justify-center bg-blue-900/15 rounded-full w-12 h-12 mr-2">
          <Scale size={iconSize} className="text-blue-400" />
        </div>
        <div>
          <CardTitle className="text-base font-bold text-white mb-0">Highest SOS</CardTitle>
          <div className="font-extrabold text-xl text-blue-300">{highestSOS.sos}</div>
          <div className="text-xs text-gray-400 font-light">{highestSOS.teamName}</div>
        </div>
      </Card>
      <Card className="flex flex-row items-center gap-3 py-3 bg-[#1E1E1E] rounded-xl shadow font-inter">
        <div className="flex items-center justify-center bg-purple-900/20 rounded-full w-12 h-12 mr-2">
          <Bolt size={iconSize} className="text-purple-300" />
        </div>
        <div>
          <CardTitle className="text-base font-bold text-white mb-0 flex gap-2 items-center">
            Highest Power Score
          </CardTitle>
          <div className="font-extrabold text-xl text-purple-300">{formatPowerScore(highestPowerScore.score)}</div>
          <div className="text-xs text-gray-400 font-light">{highestPowerScore.teamName}</div>
        </div>
      </Card>
    </div>
  );
};

export default StatsSummaryCards;

