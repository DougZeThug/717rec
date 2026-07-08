import { ArrowUpDown, Calendar, Download, Search, Swords, Trophy, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHeadToHead } from '@/hooks/useHeadToHead';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import type { HeadToHeadRecord } from '@/types/headToHead';
import { exportHeadToHeadToCSV } from '@/utils/exportUtils';
import { formatWithPattern } from '@/utils/formatDateSafe';
import { getRivalryType, type RivalryType } from '@/utils/teamDetailsUtils/rivalryUtils';
import { toTeamSlug } from '@/utils/teamSlug';

import H2HMobileCard from './H2HMobileCard';
import { OpponentHistoryModal } from './OpponentHistoryModal';

interface HeadToHeadRecordsProps {
  teamId: string;
  teamName?: string;
  standalone?: boolean;
}

type SortField = 'opponent_name' | 'win_pct' | 'matches_played' | 'wins' | 'game_wins';
type SortDirection = 'asc' | 'desc';

// Module-scope sort button so React keeps a stable component identity.
const SortButton: React.FC<{
  field: SortField;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}> = ({ field, onSort, children }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onSort(field)}
    className="h-auto p-1 font-medium justify-start text-foreground hover:text-foreground hover:bg-muted/80"
  >
    {children}
    <ArrowUpDown className="ml-1 size-3" />
  </Button>
);

const rivalryBadgeConfig: Record<RivalryType, { label: string; className: string }> = {
  rival: {
    label: 'Rival',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  dominated: {
    label: 'Dominated',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  favorite: {
    label: 'Favorite',
    className: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
  nemesis: {
    label: 'Nemesis',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  },
  tough_matchup: {
    label: 'Tough Matchup',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
};

const HeadToHeadRecords: React.FC<HeadToHeadRecordsProps> = ({
  teamId,
  teamName = 'Team',
  standalone = false,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: records, isLoading, error } = useHeadToHead(teamId);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('wins');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; name: string } | null>(
    null
  );

  const filteredRecords = useMemo(() => {
    const displayRecords = records || [];
    return displayRecords
      .filter((record) => record.opponent_name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let aValue: HeadToHeadRecord[SortField] = a[sortField];
        let bValue: HeadToHeadRecord[SortField] = b[sortField];

        if (sortField === 'opponent_name') {
          aValue = (aValue as string).toLowerCase();
          bValue = (bValue as string).toLowerCase();
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [records, searchTerm, sortField, sortDirection]);

  // For empty state check
  const hasRecords = records && records.length > 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleTeamClick = (opponentId: string, opponentName: string) => {
    navigate(`/teams/${toTeamSlug(opponentName)}`);
  };

  const content = (() => {
    if (isLoading) {
      return <LoadingState variant="section" message="Loading records..." />;
    }

    if (error) {
      return (
        <div className="text-center py-4 text-rose-600">Error loading head-to-head records</div>
      );
    }

    if (!hasRecords) {
      return (
        <div className="text-center py-8">
          <Swords className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No head-to-head records yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Records will appear after playing against other teams
          </p>
        </div>
      );
    }

    const handleCardClick = (opponentId: string, opponentName: string) => {
      setSelectedOpponent({ id: opponentId, name: opponentName });
    };

    return (
      <>
        {/* Search + controls bar */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-2 top-2.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search opponents..."
              aria-label="Search opponents"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          {/* Mobile: sort dropdown */}
          {isMobile && (
            <Select
              value={`${sortField}-${sortDirection}`}
              onValueChange={(val) => {
                const [field, dir] = val.split('-') as [SortField, SortDirection];
                setSortField(field);
                setSortDirection(dir);
              }}
            >
              <SelectTrigger className="w-[130px] flex-shrink-0">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wins-desc">Most Wins</SelectItem>
                <SelectItem value="win_pct-desc">Best Win%</SelectItem>
                <SelectItem value="matches_played-desc">Most Matches</SelectItem>
                <SelectItem value="opponent_name-asc">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportHeadToHeadToCSV(filteredRecords, teamName)}
            className="flex-shrink-0"
          >
            <Download className="size-4 mr-1" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No opponents found matching "{searchTerm}"
          </div>
        ) : isMobile ? (
          /* Mobile: Card list */
          <div className="space-y-2">
            {filteredRecords.map((record) => (
              <H2HMobileCard
                key={record.opponent_name}
                record={record}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        ) : (
          /* Desktop: Table (unchanged) */
          <div className="relative">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">
                      <SortButton field="opponent_name" onSort={handleSort}>
                        Opponent
                      </SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="wins" onSort={handleSort}>
                        W-L
                      </SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="win_pct" onSort={handleSort}>
                        Win%
                      </SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="matches_played" onSort={handleSort}>
                        Matches
                      </SortButton>
                    </th>
                    <th className="text-center py-2">
                      <SortButton field="game_wins" onSort={handleSort}>
                        Game W-L
                      </SortButton>
                    </th>
                    <th className="text-left py-2">Last Played</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.opponent_name} className="border-b hover:bg-muted/50">
                      <td className="py-3">
                        {(() => {
                          const rivalryType = getRivalryType(record);
                          const badge = rivalryType ? rivalryBadgeConfig[rivalryType] : null;
                          return (
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label={`View team details for ${record.opponent_name}`}
                              className="flex items-center space-x-3 cursor-pointer hover:bg-muted/30 rounded-md p-1 -m-1 transition-colors"
                              onClick={() =>
                                handleTeamClick(record.opponent_id, record.opponent_name)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleTeamClick(record.opponent_id, record.opponent_name);
                                }
                              }}
                            >
                              {record.opponent_image_url ? (
                                <img
                                  src={record.opponent_image_url}
                                  alt={`${record.opponent_name} logo`}
                                  className="size-8 rounded-sm object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="size-8 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {record.opponent_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium hover:text-primary transition-colors truncate">
                                  {record.opponent_name}
                                </span>
                                {badge && (
                                  <span
                                    className={cn(
                                      'text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap',
                                      badge.className
                                    )}
                                  >
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Trophy className="size-3 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">{record.wins}</span>
                          <span>-</span>
                          <X className="size-3 text-rose-500" />
                          <span className="text-rose-600 font-medium">{record.losses}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <Badge variant={record.win_pct >= 50 ? 'default' : 'secondary'}>
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
                            <Calendar className="size-3" />
                            <span>{formatWithPattern(record.last_played_at, 'MMM d, yyyy')}</span>
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
                            onClick={() =>
                              setSelectedOpponent({
                                id: record.opponent_id,
                                name: record.opponent_name,
                              })
                            }
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
          </div>
        )}
      </>
    );
  })();

  if (standalone) {
    return (
      <>
        {content}
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
  }

  return (
    <>
      <CollapsibleSection
        title="Head-to-Head Records"
        icon={Swords}
        iconColor="text-emerald-500"
        defaultOpen={false}
        headingId="h2h-heading"
      >
        {content}
      </CollapsibleSection>

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
