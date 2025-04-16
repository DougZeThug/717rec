
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ranking } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/teamDetailsUtils/powerScoreUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface CompactStandingsProps {
  rankings: Ranking[];
}

const CompactStandings: React.FC<CompactStandingsProps> = ({ rankings }) => {
  const isMobile = useIsMobile();

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
            className="flex items-center justify-between p-2 rounded-lg border"
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
                <span className="font-medium">{team.teamName}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <span>{team.wins}-{team.losses}</span>
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
            <TableHead className="w-10">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">Record</TableHead>
            <TableHead className="text-center">Win %</TableHead>
            <TableHead className="text-center">Power Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((team, index) => (
            <TableRow key={team.teamId}>
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
                  <span className="font-medium">{team.teamName}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {team.wins}-{team.losses}
              </TableCell>
              <TableCell className="text-center">
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
