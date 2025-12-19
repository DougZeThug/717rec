
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { HeadToHeadRecord } from "@/types/headToHead";
import { useHeadToHead } from "@/hooks/useHeadToHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowUpDown, Search, Calendar, Trophy, X, ChevronDown, Swords } from "lucide-react";
import { OpponentHistoryModal } from "./OpponentHistoryModal";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface HeadToHeadRecordsProps {
  teamId: string;
}

type SortField = 'opponent_name' | 'win_pct' | 'matches_played' | 'wins' | 'game_wins';
type SortDirection = 'asc' | 'desc';

const HeadToHeadRecords: React.FC<HeadToHeadRecordsProps> = ({ teamId }) => {
  const navigate = useNavigate();
  const { data: records, isLoading, error } = useHeadToHead(teamId);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('wins');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; name: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Use fresh database data directly  
  const displayRecords = records || [];

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

  const handleTeamClick = (opponentId: string) => {
    navigate(`/teams/${opponentId}`);
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
        <div className="border rounded-lg bg-card shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
              <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
                Head-to-Head Records
              </h2>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 md:p-4 pt-0 border-t">
              <div className="text-center py-4 text-muted-foreground">Loading head-to-head records...</div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  if (error) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg bg-card shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
              <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
                Head-to-Head Records
              </h2>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 md:p-4 pt-0 border-t">
              <div className="text-center py-4 text-rose-600">Error loading head-to-head records</div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  if (displayRecords.length === 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg bg-card shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
              <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
                Head-to-Head Records
              </h2>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 md:p-4 pt-0 border-t">
              <div className="text-center py-4 text-muted-foreground">No head-to-head records available</div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border rounded-lg bg-card shadow-sm">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
              <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
                Head-to-Head Records
              </h2>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 md:p-4 pt-0 border-t">
              <div className="flex items-center space-x-2 mb-4 pt-3">
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
            <div className="relative">
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
                         <td className="py-3">
                           <div 
                             className="flex items-center space-x-3 cursor-pointer hover:bg-muted/30 rounded-md p-1 -m-1 transition-colors"
                             onClick={() => handleTeamClick(record.opponent_id)}
                           >
                             {record.opponent_image_url ? (
                               <img 
                                 src={record.opponent_image_url} 
                                 alt={`${record.opponent_name} logo`}
                                 className="w-8 h-8 rounded-sm object-cover flex-shrink-0"
                               />
                             ) : (
                               <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
                                 <span className="text-xs font-medium text-muted-foreground">
                                   {record.opponent_name.charAt(0).toUpperCase()}
                                 </span>
                               </div>
                             )}
                             <span className="font-medium hover:text-primary transition-colors">{record.opponent_name}</span>
                           </div>
                         </td>
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
              {/* Right edge gradient hint for horizontal scroll - visible on mobile */}
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent pointer-events-none md:hidden" />
            </div>
             )}
            </div>
          </CollapsibleContent>
        </div>
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
