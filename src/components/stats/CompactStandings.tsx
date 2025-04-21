
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
}

const CompactStandings: React.FC<CompactStandingsProps> = ({ rankings }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleTeamClick = (teamId: string) => {
    navigate(`/teams/${teamId}`);
  };

  const getRankStyles = (index: number) => {
    if (index === 0) return "bg-amber-100 text-amber-800 font-bold";
    if (index === 1) return "bg-slate-100 text-slate-700 font-bold";
    if (index === 2) return "bg-orange-100 text-orange-800 font-bold";
    return "";
  };

  const getLogoUrl = (team: Ranking) => {
    return team.logoUrl || team.imageUrl || "/default-logo.png";
  };

  if (isMobile) {
    return (
      <div className="space-y-2">
        {rankings.map((team, index) => (
          <div
            key={team.teamId}
            onClick={() => handleTeamClick(team.teamId)}
            className={getRowInteractionStyles("flex items-center justify-between p-2 rounded-lg border cursor-pointer")}
          >
            <div className="flex items-center space-x-3">
              <div className={cn("w-7 h-7 flex items-center justify-center rounded-full", getRankStyles(index))}>
                {index + 1}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src={getLogoUrl(team)}
                    alt={`${team.teamName} logo`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-logo.png";
                      console.log(`Failed to load logo for ${team.teamName}, using default`);
                    }}
                  />
                </div>
                <span className="font-medium hover:text-blue-600 hover:underline">{team.teamName}</span>
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
            <TableRow 
              key={team.teamId} 
              className={getRowInteractionStyles("cursor-pointer")}
              onClick={() => handleTeamClick(team.teamId)}
            >
              <TableCell className={getRankStyles(index)}>
                <div className="w-8 h-8 flex items-center justify-center rounded-full">
                  {index + 1}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    <img
                      src={getLogoUrl(team)}
                      alt={`${team.teamName} logo`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default-logo.png";
                        console.log(`Failed to load logo for ${team.teamName}, using default`);
                      }}
                    />
                  </div>
                  <span className="font-medium hover:text-blue-600 hover:underline">{team.teamName}</span>
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
