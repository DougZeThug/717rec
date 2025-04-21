
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
import { ArrowDown, ArrowUp, LightningBolt, Scale } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PowerScoreTooltip } from "@/components/shared/PowerScoreTooltip";
import { Badge } from "@/components/ui/badge";

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
  // If not showing unified view, group by division
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
      className={`cursor-pointer hover:bg-gray-50 ${className || ''} font-medium font-inter`}
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
            <h3 className="text-lg font-medium mb-3 flex items-center font-inter text-gray-100">
              {divisionName} <span className="text-muted-foreground ml-1">({divisionRankings.length})</span>
            </h3>
          )}
          <div className="overflow-x-auto">
            <Table className="bg-[#1E1E1E] rounded-xl shadow font-inter">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 font-medium font-inter text-white">Rank</TableHead>
                  <TableHead className="font-medium font-inter text-white">Team</TableHead>
                  {showUnified && <TableHead className="font-inter text-white">Division</TableHead>}
                  <TableHead className="text-center font-inter text-white">
                    <div className="flex items-center justify-center gap-1">
                      <LightningBolt className="inline-block text-purple-300" size={16} />
                      <span onClick={() => onSortChange('powerScore')} className="cursor-pointer">
                        Power Score {renderSortIndicator('powerScore')}
                      </span>
                    </div>
                  </TableHead>
                  <SortableHeader field="wins" className="text-center text-white">W-L</SortableHeader>
                  <SortableHeader field="winPercentage" className="text-center text-white">Win %</SortableHeader>
                  <SortableHeader field="gamesWon" className="text-center hidden md:table-cell text-white">Games (W-L)</SortableHeader>
                  <SortableHeader field="gameWinPercentage" className="text-center hidden lg:table-cell text-white">Game %</SortableHeader>
                  <SortableHeader field="sos" className="text-center text-white">
                    <div className="flex items-center gap-1 justify-center">
                      <Scale className="inline-block text-blue-300" size={15} />
                      SOS
                    </div>
                  </SortableHeader>
                  <TableHead className="text-center font-inter text-white">Streak</TableHead>
                  <TableHead className="text-center font-inter text-white">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisionRankings.map((ranking) => {
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
                          {/* Soft shadow divider */}
                          <TableCell colSpan={showUnified ? 11 : 10} className="bg-gray-900/80 p-0 rounded-b-xl shadow-inner">
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
