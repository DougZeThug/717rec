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
import { ArrowDown, ArrowUp, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { PowerScoreTooltip } from "@/components/shared/PowerScoreTooltip";

interface RankingsDesktopViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
}

const RankingsDesktopView: React.FC<RankingsDesktopViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
}) => {
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
      className={`cursor-pointer hover:bg-gray-50 ${className || ''}`}
      onClick={() => onSortChange(field)}
    >
      <div className="flex items-center justify-center">
        {children}
        {renderSortIndicator(field)}
      </div>
    </TableHead>
  );

  const rankingsByDivision: Record<string, Ranking[]> = {};
  rankings.forEach(ranking => {
    const divisionName = ranking.divisionName || "Unassigned";
    if (!rankingsByDivision[divisionName]) {
      rankingsByDivision[divisionName] = [];
    }
    rankingsByDivision[divisionName].push(ranking);
  });

  return (
    <div>
      {Object.entries(rankingsByDivision).map(([divisionName, divisionRankings]) => (
        <div key={divisionName} className="mb-8">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            {divisionName} <span className="text-muted-foreground ml-1">({divisionRankings.length})</span>
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <PowerScoreTooltip />
                      <span onClick={() => onSortChange('powerScore')} className="cursor-pointer">
                        Power Score {renderSortIndicator('powerScore')}
                      </span>
                    </div>
                  </TableHead>
                  <SortableHeader field="wins" className="text-center">W-L</SortableHeader>
                  <SortableHeader field="winPercentage" className="text-center">Win %</SortableHeader>
                  <SortableHeader field="gamesWon" className="text-center hidden md:table-cell">Games (W-L)</SortableHeader>
                  <SortableHeader field="gameWinPercentage" className="text-center hidden lg:table-cell">Game %</SortableHeader>
                  <SortableHeader field="sos" className="text-center">SOS</SortableHeader>
                  <TableHead className="text-center">Streak</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
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
                      />
                      {expandedTeam === ranking.teamId && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-gray-50 p-0">
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
