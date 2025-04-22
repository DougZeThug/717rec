
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ranking } from "@/types";
import RankingTableRow from "./RankingTableRow";
import HeadToHeadRecords from "./HeadToHeadRecords";
import { SortOptions } from "./RankingsTable";
import { ArrowDown, ArrowUp, Bolt, Scale } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PowerScoreTooltip } from "@/components/shared/PowerScoreTooltip";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";

interface RankingsDesktopViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified?: boolean;
}

const RankingsDesktopView: React.FC<RankingsDesktopViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified = false
}) => {
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  const rankingsByDivision = showUnified 
    ? { "All Teams": rankings }
    : rankings.reduce((acc, ranking) => {
        const divisionName = ranking.divisionName || "Unassigned";
        if (!acc[divisionName]) {
          acc[divisionName] = [];
        }
        acc[divisionName].push(ranking);
        return acc;
      }, {} as Record<string, Ranking[]>);

  const renderSortIndicator = (field: string) => {
    if (sortOptions.field === field) {
      return sortOptions.direction === 'asc' 
        ? <ArrowUp className="inline-block ml-1 h-4 w-4" /> 
        : <ArrowDown className="inline-block ml-1 h-4 w-4" />;
    }
    return null;
  };

  const SortableHeader = ({ field, children, className }: { field: string, children: React.ReactNode, className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-800 dark:text-white font-mono ${className || ''}`}
      onClick={() => onSortChange(field)}
    >
      <div className="flex items-center justify-center">
        {children}
        {renderSortIndicator(field)}
      </div>
    </TableHead>
  );

  const getPowerScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="font-inter">
      {Object.entries(rankingsByDivision).map(([divisionName, divisionRankings]) => (
        <div key={divisionName} className="mb-8">
          {!showUnified && (
            <h3 className="text-lg font-semibold mb-3 flex items-center font-inter text-gray-800 dark:text-white">
              <span>{divisionName}</span>{" "}
              <span className="ml-1 text-gray-600 dark:text-gray-300">
                ({divisionRankings.length})
              </span>
            </h3>
          )}
          <div className="overflow-x-auto">
            <Table className="bg-white text-gray-800 dark:bg-[#1E1E1E] dark:text-white border border-[#e0e0e0] dark:border-gray-700 rounded-xl shadow-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-sm font-mono font-semibold text-gray-800 dark:text-white tracking-wide">Rank</TableHead>
                  <TableHead className="text-sm font-semibold font-oswald uppercase tracking-wide text-gray-800 dark:text-white">
                    Team
                  </TableHead>
                  {showUnified && (
                    <TableHead className="text-sm font-semibold font-oswald uppercase tracking-wide text-gray-800 dark:text-white">Division</TableHead>
                  )}
                  <TableHead className="text-center text-sm font-medium font-mono text-gray-800 dark:text-white">
                    <div className="flex items-center justify-center gap-1">
                      <span onClick={() => onSortChange('powerScore')} className="cursor-pointer flex items-center">
                        <span className="mr-1 font-mono">Power Score</span> {renderSortIndicator('powerScore')}
                      </span>
                    </div>
                  </TableHead>
                  <SortableHeader field="wins">W-L</SortableHeader>
                  <SortableHeader field="winPercentage">Win %</SortableHeader>
                  <SortableHeader field="gamesWon" className="hidden md:table-cell">Games (W-L)</SortableHeader>
                  <SortableHeader field="gameWinPercentage" className="hidden lg:table-cell">Game %</SortableHeader>
                  <SortableHeader field="sos">
                    <div className="flex items-center gap-1 justify-center">
                      <span>SOS</span>
                    </div>
                  </SortableHeader>
                  <TableHead className="text-center text-sm font-medium font-mono text-gray-800 dark:text-white">Streak</TableHead>
                  <TableHead className="text-center text-sm font-medium font-mono text-gray-800 dark:text-white">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisionRankings.map((ranking) => {
                  const overallIndex = rankings.findIndex(r => r.teamId === ranking.teamId);
                  return (
                    <React.Fragment key={ranking.teamId}>
                      <TableRow className="font-inter">
                        <TableCell className="font-mono font-semibold text-lg">
                          {overallIndex + 1}
                          {!showUnified && ranking.divisionRank && (
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-inter">
                              ({ranking.divisionRank})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {ranking.logoUrl || ranking.imageUrl ? (
                              <img
                                src={ranking.logoUrl || ranking.imageUrl}
                                alt={ranking.teamName}
                                className="w-7 h-7 rounded-full object-cover mr-2"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 text-base mr-2">
                                {ranking.teamName?.charAt(0) || "T"}
                              </div>
                            )}
                            <span className="font-inter font-medium">{ranking.teamName}</span>
                          </div>
                        </TableCell>
                        {showUnified && (
                          <TableCell>
                            <span className="font-inter">{ranking.divisionName}</span>
                          </TableCell>
                        )}
                        <TableCell className={`text-center font-mono font-semibold ${getPowerScoreColor(ranking.powerScore)}`}>
                          {ranking.powerScore?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center font-mono">{ranking.wins}-{ranking.losses}</TableCell>
                        <TableCell className="text-center font-mono">{(ranking.winPercentage * 100).toFixed(1)}%</TableCell>
                        <TableCell className="hidden md:table-cell text-center font-mono">{ranking.gamesWon}-{ranking.gamesLost}</TableCell>
                        <TableCell className="hidden lg:table-cell text-center font-mono">{(ranking.gameWinPercentage * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-center font-mono">{ranking.sos?.toFixed(3)}</TableCell>
                        <TableCell className="text-center">
                          {/* Streak rendering logic, usually with a badge */}
                          <span className="font-mono">{ranking.streak}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {/* Trend indicator (icon/text), can style with font-mono if desired */}
                        </TableCell>
                      </TableRow>
                      {expandedTeam === ranking.teamId && (
                        <TableRow>
                          <TableCell colSpan={showUnified ? 11 : 10} className="bg-[#f5f5f5] dark:bg-gray-900/80 p-0 rounded-b-xl shadow-inner">
                            <div className="p-4">
                              <HeadToHeadRecords headToHead={ranking.headToHead} />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RankingsDesktopView;
