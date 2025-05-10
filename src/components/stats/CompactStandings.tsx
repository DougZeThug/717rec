
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/colors";
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

  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${teamId}`);
  };

  const getRankStyles = (index: number) => {
    if (isLight) {
      if (index === 0) return "bg-amber-100 !font-bold text-gray-900";
      if (index === 1) return "bg-slate-100 !font-bold text-gray-900";
      if (index === 2) return "bg-orange-100 !font-bold text-gray-900";
      return "bg-gray-50 text-gray-900";
    } else {
      if (index === 0) return "bg-amber-900/30 font-bold text-white";
      if (index === 1) return "bg-slate-800/30 font-bold text-white";
      if (index === 2) return "bg-orange-900/30 font-bold text-white";
      return "bg-gray-800/30 text-white";
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-2">
        {rankings.map((team, index) => (
          <div
            key={team.teamId}
            onClick={() => handleTeamClick(team.teamId)}
            className={getRowInteractionStyles("flex items-center justify-between p-2 rounded-lg border cursor-pointer bg-white dark:bg-gray-800 dark:border-gray-700")}
          >
            <div className="flex items-center space-x-2">
              <div
                className={cn("w-7 h-7 flex items-center justify-center rounded-full font-mono", getRankStyles(index))}
              >
                {index + 1}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  {team.imageUrl && (
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <img
                        src={team.imageUrl}
                        alt={team.teamName}
                        className="w-8 h-8 rounded-none object-contain"
                      />
                    </div>
                  )}
                  <span className="font-bebas tracking-wide uppercase text-base text-gray-900 dark:text-white">
                    {team.teamName}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm font-mono mt-0.5">
                  <span className="text-gray-900 dark:text-white">{team.wins}-{team.losses}</span>
                  <span className="text-gray-900 dark:text-white">{(team.winPercentage * 100).toFixed(1)}%</span>
                  <span className={getPowerScoreColor(team.powerScore)}>
                    {formatPowerScore(team.powerScore)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm">
        <TableHeader>
          <TableRow className={isLight ? "bg-gray-50" : "bg-gray-800/60"}>
            <TableHead
              className="w-10 font-mono tracking-wide text-gray-700 dark:text-gray-200"
            >
              Rank
            </TableHead>
            <TableHead
              className="font-semibold uppercase tracking-wide font-oswald text-gray-700 dark:text-gray-200"
            >
              Team
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Record
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Win %
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Power Score
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((team, index) => (
            <TableRow
              key={team.teamId}
              className={getRowInteractionStyles("cursor-pointer font-inter")}
              style={isLight ? { background: index % 2 === 0 ? "#fff" : "#f5f5f5" } : {}}
              onClick={() => handleTeamClick(team.teamId)}
            >
              <TableCell
                className={cn(getRankStyles(index), "font-mono text-lg")}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-full">
                  {index + 1}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3 min-w-0">
                  {team.imageUrl && (
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <img
                        src={team.imageUrl}
                        alt={team.teamName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <span
                    className="font-bebas tracking-wide uppercase text-base text-gray-900 dark:text-white"
                  >
                    {team.teamName}
                  </span>
                </div>
              </TableCell>
              <TableCell
                className="text-center font-mono text-gray-900 dark:text-white"
              >
                <span>
                  {team.wins}-{team.losses}
                </span>
              </TableCell>
              <TableCell
                className="text-center font-mono text-gray-900 dark:text-white"
              >
                <span>
                  {(team.winPercentage * 100).toFixed(1)}%
                </span>
              </TableCell>
              <TableCell
                className={cn("text-center font-semibold font-mono", getPowerScoreColor(team.powerScore))}
              >
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
