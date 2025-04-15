
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ranking, HeadToHeadRecord } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RankingsTableProps {
  rankings: Ranking[];
}

const RankingsTable: React.FC<RankingsTableProps> = ({ rankings }) => {
  const isMobile = useIsMobile();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const renderTrendIndicator = (rankChange?: number) => {
    if (!rankChange || rankChange === 0) {
      return <Minus size={16} className="text-gray-500" />;
    } else if (rankChange > 0) {
      return <TrendingUp size={16} className="text-green-500" />;
    } else {
      return <TrendingDown size={16} className="text-red-500" />;
    }
  };

  const renderHeadToHead = (teamId: string) => {
    const team = rankings.find(r => r.teamId === teamId);
    if (!team?.headToHead || Object.keys(team.headToHead).length === 0) {
      return <div className="text-sm text-gray-500">No head-to-head records available</div>;
    }

    return (
      <div className="space-y-2 p-2">
        <h4 className="font-medium text-sm">Head-to-Head Records</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {Object.values(team.headToHead).map((record) => (
            <div key={record.opponentName} className="border rounded p-2 bg-gray-50">
              <span className="font-medium">vs. {record.opponentName}: </span>
              <span>{record.wins}–{record.losses}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isMobile) {
    // Mobile card layout
    return (
      <div className="space-y-4">
        {rankings.map((ranking, index) => (
          <Collapsible
            key={ranking.teamId}
            className="border rounded-lg overflow-hidden"
          >
            <div className="p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="font-medium text-lg">{index + 1}</div>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                    {ranking.imageUrl ? (
                      <img 
                        src={ranking.imageUrl} 
                        alt={ranking.teamName} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">No Logo</div>
                    )}
                  </div>
                  <span className="font-medium">{ranking.teamName}</span>
                </div>

                <CollapsibleTrigger className="p-2">
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                <div className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-gray-500 text-xs">Record</div>
                  <div>{ranking.wins}-{ranking.losses}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-gray-500 text-xs">Win %</div>
                  <div>{(ranking.winPercentage * 100).toFixed(1)}%</div>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-gray-500 text-xs">Streak</div>
                  <div>{ranking.streak || '—'}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-gray-500 text-xs">SOS</div>
                  <div>{(ranking.sos || 0).toFixed(3)}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-gray-500 text-xs">Division</div>
                  <div>{ranking.divisionName || 'Not Assigned'}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-gray-500 text-xs">Trend</div>
                  <div className="flex justify-center">{renderTrendIndicator(ranking.rankChange)}</div>
                </div>
              </div>
            </div>

            <CollapsibleContent className="bg-gray-50 p-4 border-t">
              {renderHeadToHead(ranking.teamId)}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="hidden md:table-cell">Division</TableHead>
            <TableHead className="text-center">W-L</TableHead>
            <TableHead className="text-center">Win %</TableHead>
            <TableHead className="text-center">Streak</TableHead>
            <TableHead className="text-center">SOS</TableHead>
            <TableHead className="text-center">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking, index) => (
            <React.Fragment key={ranking.teamId}>
              <TableRow 
                className="cursor-pointer hover:bg-gray-100" 
                onClick={() => toggleExpand(ranking.teamId)}
              >
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                      {ranking.imageUrl ? (
                        <img 
                          src={ranking.imageUrl} 
                          alt={ranking.teamName} 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">No Logo</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{ranking.teamName}</span>
                      {expandedTeam === ranking.teamId ? 
                        <ChevronUp size={16} className="text-gray-500" /> : 
                        <ChevronDown size={16} className="text-gray-500" />
                      }
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {ranking.divisionName || 'Not Assigned'}
                </TableCell>
                <TableCell className="text-center">
                  {ranking.wins}-{ranking.losses}
                </TableCell>
                <TableCell className="text-center">
                  {(ranking.winPercentage * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-center">
                  {ranking.streak || '—'}
                </TableCell>
                <TableCell className="text-center">
                  {(ranking.sos || 0).toFixed(3)}
                </TableCell>
                <TableCell className="text-center">
                  {renderTrendIndicator(ranking.rankChange)}
                </TableCell>
              </TableRow>
              {expandedTeam === ranking.teamId && (
                <TableRow>
                  <TableCell colSpan={8} className="bg-gray-50 p-0">
                    <div className="p-4">
                      {renderHeadToHead(ranking.teamId)}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RankingsTable;
