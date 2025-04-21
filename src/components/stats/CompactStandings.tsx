import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getRowInteractionStyles } from "@/styles/interactionUtils";
import { useNavigate } from "react-router-dom";

interface CompactStandingsProps {
  rankings: Ranking[];
  theme?: string;
}

const CompactStandings: React.FC<CompactStandingsProps> = ({ rankings, theme }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isLight = theme === "light";

  // Function to handle team selection
  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${teamId}`);
  };

  // Function to get rank styling for medal positions
  const getRankStyles = (index: number) => {
    if (index === 0) return "bg-amber-100 text-amber-800 font-bold"; // Gold
    if (index === 1) return "bg-slate-100 text-slate-700 font-bold"; // Silver
    if (index === 2) return "bg-orange-100 text-orange-800 font-bold"; // Bronze
    return "";
  };

  if (isMobile) {
    return (
      <div className="space-y-2">
        {rankings.map((team, index) => (
          <div
            key={team.teamId}
            onClick={() => handleTeamClick(team.teamId)}
            className={getRowInteractionStyles("flex items-center justify-between p-2 rounded-lg border cursor-pointer", undefined, isLight ? "#e0e0e0" : undefined)}
            style={isLight ? { background: index % 2 === 0 ? "#fff" : "#f5f5f5", border: "1px solid #e0e0e0" } : {}}
          >
            <div className="flex items-center space-x-3">
              <div className={cn("w-7 h-7 flex items-center justify-center rounded-full", getRankStyles(index))}>
                {index + 1}
              </div>
              <div className="flex items-center space-x-2">
                {team.imageUrl && (
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <img src={team.imageUrl} alt={team.teamName} className="w-full h-full object-cover" />
                  </div>
                )}
                <span className="font-medium hover:text-blue-600 hover:underline" style={isLight ? { color: "#1a1a1a" } : {}}>{team.teamName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span style={isLight ? { color: "#2c2c2c" } : {}}>{team.wins}-{team.losses}</span>
              <span className={getPowerScoreColor(team.powerScore)}>
                {formatPowerScore(team.powerScore)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" style={isLight ? { color: "#1a1a1a", fontWeight: 600 } : {}}>Rank</TableHead>
            <TableHead style={isLight ? { color: "#1a1a1a", fontWeight: 600 } : {}}>Team</TableHead>
            <TableHead className="text-center" style={isLight ? { color: "#1a1a1a" } : {}}>Record</TableHead>
            <TableHead className="text-center" style={isLight ? { color: "#1a1a1a" } : {}}>Win %</TableHead>
            <TableHead className="text-center" style={isLight ? { color: "#1a1a1a" } : {}}>Power Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((team, index) => (
            <TableRow 
              key={team.teamId} 
              className={getRowInteractionStyles("cursor-pointer", undefined, isLight ? "#e0e0e0" : undefined)}
              style={isLight ? { background: index % 2 === 0 ? "#fff" : "#f5f5f5", color: "#1a1a1a" } : {}}
              onClick={() => handleTeamClick(team.teamId)}
            >
              <TableCell className={getRankStyles(index)}>
                <div className="w-8 h-8 flex items-center justify-center rounded-full">
                  {index + 1}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  {team.imageUrl && (
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        src={team.imageUrl}
                        alt={team.teamName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className="font-medium hover:text-blue-600 hover:underline" style={isLight ? { color: "#1a1a1a" } : {}}>{team.teamName}</span>
                </div>
              </TableCell>
              <TableCell className="text-center" style={isLight ? { color: "#333" } : {}}>
                {team.wins}-{team.losses}
              </TableCell>
              <TableCell className="text-center" style={isLight ? { color: "#333" } : {}}>
                {(team.winPercentage * 100).toFixed(1)}%
              </TableCell>
              <TableCell className={cn("text-center font-semibold", getPowerScoreColor(team.powerScore))}>
                {formatPowerScore(team.powerScore)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CompactStandings;
