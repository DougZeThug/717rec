
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface StatsSummaryCardsProps {
  rankings: Ranking[];
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
  
  const getHighestGameWinPercentage = () => {
    if (!rankings || rankings.length === 0) return { percentage: 0, teamName: 'No teams' };
    
    // Only consider teams with game stats
    const teamsWithGameStats = rankings.filter(team => team.gameWinPercentage !== undefined);
    
    if (teamsWithGameStats.length === 0) return { percentage: 0, teamName: 'No game stats' };
    
    const highest = teamsWithGameStats.reduce((max, team) => 
      ((team.gameWinPercentage || 0) > (max.gameWinPercentage || 0)) ? team : max, teamsWithGameStats[0]);
    
    return {
      percentage: highest && highest.gameWinPercentage !== undefined
        ? (highest.gameWinPercentage * 100).toFixed(1)
        : 0,
      teamName: highest?.teamName || 'No teams'
    };
  };

  const highestWinPercentage = getHighestWinPercentage();
  const mostWins = getMostWins();
  const highestSOS = getHighestSOS();
  const highestGameWinPercentage = getHighestGameWinPercentage();

  // Optimize card styling for mobile
  const cardStyles = isMobile ? "py-3" : "pb-2";
  const contentStyles = isMobile ? "py-3" : "";
  const fontStyles = isMobile ? "text-3xl" : "text-4xl";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className={cardStyles}>
          <CardTitle className="text-lg">Total Teams</CardTitle>
          <CardDescription className="text-xs">Active teams in the league</CardDescription>
        </CardHeader>
        <CardContent className={contentStyles}>
          <div className={`${fontStyles} font-bold text-cornhole-navy`}>{rankings ? rankings.length : 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className={cardStyles}>
          <CardTitle className="text-lg">Highest Win %</CardTitle>
          <CardDescription className="text-xs">Best performing team</CardDescription>
        </CardHeader>
        <CardContent className={contentStyles}>
          <div className="flex flex-col">
            <span className={`${fontStyles} font-bold text-cornhole-green`}>
              {highestWinPercentage.percentage}%
            </span>
            <span className="text-xs text-gray-500">
              {highestWinPercentage.teamName}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className={cardStyles}>
          <CardTitle className="text-lg">Highest SOS</CardTitle>
          <CardDescription className="text-xs">Team with toughest schedule</CardDescription>
        </CardHeader>
        <CardContent className={contentStyles}>
          <div className="flex flex-col">
            <span className={`${fontStyles} font-bold text-cornhole-navy`}>
              {highestSOS.sos}
            </span>
            <span className="text-xs text-gray-500">
              {highestSOS.teamName}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className={cardStyles}>
          <CardTitle className="text-lg">Best Game Win %</CardTitle>
          <CardDescription className="text-xs">Team with highest game win rate</CardDescription>
        </CardHeader>
        <CardContent className={contentStyles}>
          <div className="flex flex-col">
            <span className={`${fontStyles} font-bold text-cornhole-green`}>
              {highestGameWinPercentage.percentage}%
            </span>
            <span className="text-xs text-gray-500">
              {highestGameWinPercentage.teamName}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsSummaryCards;
