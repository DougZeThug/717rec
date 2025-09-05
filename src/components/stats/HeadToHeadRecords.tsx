
import React, { useState } from "react";
import { HeadToHeadMap } from "@/types";
import { HeadToHeadRecord } from "@/types/headToHead";
import { useHeadToHead } from "@/hooks/useHeadToHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowUpDown, Search, Calendar, Trophy, X, ChevronDown, ChevronRight } from "lucide-react";
import { OpponentHistoryModal } from "./OpponentHistoryModal";
import { format } from "date-fns";

interface HeadToHeadRecordsProps {
  teamId: string;
  headToHead?: HeadToHeadMap; // Keep for backward compatibility
}

type SortField = 'opponent_name' | 'win_pct' | 'matches_played' | 'wins' | 'game_wins';
type SortDirection = 'asc' | 'desc';

const HeadToHeadRecords: React.FC<HeadToHeadRecordsProps> = ({ teamId, headToHead }) => {
  const { data: records, isLoading, error } = useHeadToHead(teamId);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('win_pct');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; name: string } | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  // Fallback to legacy head-to-head data if new system fails
  const displayRecords = records?.length ? records : (headToHead ? Object.values(headToHead).map(record => ({
    team_id: teamId,
    opponent_id: '', // Not available in legacy format
    opponent_name: record.opponentName,
    matches_played: record.wins + record.losses,
    wins: record.wins,
    losses: record.losses,
    game_wins: 0, // Not available in legacy format
    game_losses: 0, // Not available in legacy format
    win_pct: record.wins + record.losses > 0 ? record.wins / (record.wins + record.losses) : 0,
    last_played_at: null
  } as HeadToHeadRecord)) : []);

  const filteredRecords = displayRecords
    .filter(record => 
      record.opponent_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'opponent_name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-1 font-medium justify-start"
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (isLoading) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Head-to-Head Records</CardTitle>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="text-center py-4 text-muted-foreground">Loading head-to-head records...</div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  if (error) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Head-to-Head Records</CardTitle>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="text-center py-4 text-rose-600">Error loading head-to-head records</div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  if (displayRecords.length === 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Head-to-Head Records</CardTitle>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="text-center py-4 text-muted-foreground">No head-to-head records available</div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Head-to-Head Records</CardTitle>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search opponents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No opponents found matching "{searchTerm}"
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">
                      <SortButton field="opponent_name">Opponent</SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="wins">W-L</SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="win_pct">Win%</SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="matches_played">Matches</SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="game_wins">Game W-L</SortButton>
                    </th>
                    <th className="text-left py-2">Last Played</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.opponent_name} className="border-b hover:bg-muted/50">
                      <td className="py-3 font-medium">{record.opponent_name}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Trophy className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">{record.wins}</span>
                          <span>-</span>
                          <X className="w-3 h-3 text-rose-500" />
                          <span className="text-rose-600 font-medium">{record.losses}</span>
                        </div>
                      </td>
                       <td className="text-center">
                         <Badge variant={record.win_pct >= 50 ? "default" : "secondary"}>
                           {Number(record.win_pct).toFixed(1)}%
                         </Badge>
                       </td>
                      <td className="text-center font-mono">{record.matches_played}</td>
                      <td className="text-center font-mono">
                        {record.game_wins}-{record.game_losses}
                      </td>
                      <td className="text-left text-sm text-muted-foreground">
                        {record.last_played_at ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(record.last_played_at), "MMM d, yyyy")}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="text-right">
                        {record.opponent_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOpponent({ 
                              id: record.opponent_id, 
                              name: record.opponent_name 
                            })}
                          >
                            View Details
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
             )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {selectedOpponent && (
        <OpponentHistoryModal
          isOpen={!!selectedOpponent}
          onClose={() => setSelectedOpponent(null)}
          teamId={teamId}
          opponentId={selectedOpponent.id}
          opponentName={selectedOpponent.name}
        />
      )}
    </>
  );
};

export default HeadToHeadRecords;
