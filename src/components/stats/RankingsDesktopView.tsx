
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

  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

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
      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${className || ''} font-medium font-inter`}
      onClick={() => onSortChange(field)}
    >
      <div className="flex items-center justify-center">
        {children}
        {renderSortIndicator(field)}
      </div>
    </TableHead>
  );

  return (
    <div className="font-inter">
      {Object.entries(rankingsByDivision).map(([divisionName, divisionRankings]) => (
        <div key={divisionName} className="mb-8">
          {!showUnified && (
            <h3
              className={`
                text-lg font-medium mb-3 flex items-center font-inter
                ${isLight 
                  ? 'text-gray-800 font-bold' 
                  : 'text-white font-normal'
                }
              `}
            >
              <span>{divisionName}</span>{" "}
              <span 
                className={`ml-1 ${isLight ? 'text-gray-600' : ''}`}
              >
                ({divisionRankings.length})
              </span>
            </h3>
          )}
          <div className="overflow-x-auto">
            <Table className="bg-white text-gray-800 dark:bg-[#1E1E1E] dark:text-white border border-[#e0e0e0] dark:border-gray-700 rounded-xl shadow-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 font-medium font-inter" style={isLight ? { color: "#111111", fontWeight: 700 } : { color: "#fff" }}>Rank</TableHead>
                  <TableHead className="font-medium font-inter" style={isLight ? { color: "#111111", fontWeight: 700 } : { color: "#fff" }}>Team</TableHead>
                  {showUnified && <TableHead className="font-inter" style={isLight ? { color: "#111111", fontWeight: 700 } : { color: "#fff" }}>Division</TableHead>}
                  <TableHead className="text-center font-inter" style={isLight ? { color: "#111111", fontWeight: 700 } : { color: "#fff" }}>
                    <div className="flex items-center justify-center gap-1">
                      <Bolt className="inline-block text-purple-300" size={16} />
                      <span onClick={() => onSortChange('powerScore')} className="cursor-pointer">
                        Power Score {renderSortIndicator('powerScore')}
                      </span>
                    </div>
                  </TableHead>
                  <SortableHeader field="wins" className="text-center" ><span style={isLight ? { color: "#111111" } : { color: "#fff" }}>W-L</span></SortableHeader>
                  <SortableHeader field="winPercentage" className="text-center"><span style={isLight ? { color: "#111111" } : { color: "#fff" }}>Win %</span></SortableHeader>
                  <SortableHeader field="gamesWon" className="text-center hidden md:table-cell"><span style={isLight ? { color: "#111111" } : { color: "#fff" }}>Games (W-L)</span></SortableHeader>
                  <SortableHeader field="gameWinPercentage" className="text-center hidden lg:table-cell"><span style={isLight ? { color: "#111111" } : { color: "#fff" }}>Game %</span></SortableHeader>
                  <SortableHeader field="sos" className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Scale className="inline-block text-blue-300" size={15} />
                      <span style={isLight ? { color: "#111111" } : { color: "#fff" }}>SOS</span>
                    </div>
                  </SortableHeader>
                  <TableHead className="text-center font-inter" style={isLight ? { color: "#111111", fontWeight: 700 } : { color: "#fff" }}>Streak</TableHead>
                  <TableHead className="text-center font-inter" style={isLight ? { color: "#111111", fontWeight: 700 } : { color: "#fff" }}>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisionRankings.map((ranking, idx) => {
                  const overallIndex = rankings.findIndex(r => r.teamId === ranking.teamId);
                  return (
                    <React.Fragment key={ranking.teamId}>
                      <RankingTableRow
                        ranking={ranking}
                        index={overallIndex}
                        isExpanded={expandedTeam === ranking.teamId}
                        onToggleExpand={() => toggleExpand(ranking.teamId)}
                        showDivision={showUnified}
                      />
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
