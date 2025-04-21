
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getRowInteractionStyles } from "@/styles/interactionUtils";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

interface CompactStandingsProps {
  rankings: Ranking[];
}

const CompactStandings: React.FC<CompactStandingsProps> = ({ rankings }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Function to handle team selection
  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${teamId}`);
  };

  // Function to get rank styling for medal positions
  const getRankStyles = (index: number) => {
    if (isLight) {
      if (index === 0) return "bg-amber-100 text-amber-800 font-bold"; // Gold
      if (index === 1) return "bg-slate-100 text-slate-700 font-bold"; // Silver
      if (index === 2) return "bg-orange-100 text-orange-800 font-bold"; // Bronze
    } else {
      if (index === 0) return "bg-amber-900/30 text-amber-200 font-bold"; // Gold dark
      if (index === 1) return "bg-slate-800/30 text-slate-300 font-bold"; // Silver dark
      if (index === 2) return "bg-orange-900/30 text-orange-200 font-bold"; // Bronze dark
    }
    return "";
  };

  if (isMobile) {
    return (
      <div className="space-y-2">
        {rankings.map((team, index) => (
          <div
            key={team.teamId}
            onClick={() => handleTeamClick(team.teamId)}
            className={getRowInteractionStyles("flex items-center justify-between p-2 rounded-lg border cursor-pointer bg-white dark:bg-transparent")}
            style={isLight ? { border: "1px solid #e0e0e0" } : { borderColor: "#333" }}
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
                <span className={cn("font-medium hover:text-blue-600 hover:underline", 
                  isLight ? "text-[#1a1a1a]" : "text-white")}>{team.teamName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span className={isLight ? "text-[#2c2c2c]" : "text-gray-200"}>{team.wins}-{team.losses}</span>
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
      <Table className="bg-white dark:bg-transparent border border-[#e0e0e0] dark:border-gray-700 rounded-xl shadow-sm">
        <TableHeader>
          <TableRow className={isLight ? "bg-gray-50" : ""}>
            <TableHead className="w-10" style={isLight ? { color: "#1a1a1a", fontWeight: 600 } : {}}>Rank</TableHead>
            <TableHead style={isLight ? { color: "#1a1a1a", fontWeight: 600 } : {}}>Team</TableHead>
            <TableHead className="text-center" style={isLight ? { color: "#1a1a1a", fontWeight: 600 } : {}}>Record</TableHead>
            <TableHead className="text-center" style={isLight ? { color: "#1a1a1a", fontWeight: 600 } : {}}>Win %</TableHead>
            <TableHead className="text-center" style={isLight ? { color: "#1a1a1a", fontWeight: 600 } : {}}>Power Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((team, index) => (
            <TableRow 
              key={team.teamId} 
              className={getRowInteractionStyles("cursor-pointer")}
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
                  <span className={cn("font-medium hover:text-blue-600 hover:underline", 
                    isLight ? "text-[#1a1a1a]" : "text-white")}>{team.teamName}</span>
                </div>
              </TableCell>
              <TableCell className="text-center" style={isLight ? { color: "#333" } : { color: "#e0e0e0" }}>
                {team.wins}-{team.losses}
              </TableCell>
              <TableCell className="text-center" style={isLight ? { color: "#333" } : { color: "#e0e0e0" }}>
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
