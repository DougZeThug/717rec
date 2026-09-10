import { Calendar, Download, Search, Swords, Trophy, X } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHeadToHead } from '@/hooks/useHeadToHead';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import type { HeadToHeadRecord } from '@/types/headToHead';
import { exportHeadToHeadToCSV } from '@/utils/exportUtils';
import { formatWithPattern } from '@/utils/formatDateSafe';
import { getRivalryType, rivalryBadgeConfig } from '@/utils/teamDetailsUtils/rivalryUtils';
import { toTeamSlug } from '@/utils/teamSlug';

import H2HMobileCard from './H2HMobileCard';
import { OpponentHistoryModal } from './OpponentHistoryModal';
import { SortableColumnHeader } from './SortableColumnHeader';

interface HeadToHeadRecordsProps {
  teamId: string;
  teamName?: string;
  standalone?: boolean;
}

type SortField = 'opponent_name' | 'win_pct' | 'matches_played' | 'wins' | 'game_wins';
type SortDirection = 'asc' | 'desc';

/**
 * The sortable columns, declared once so the header row is a map rather than
 * five near-identical blocks.
 *
 * These render through `SortableColumnHeader`, which puts a real `<Button>`
 * inside the `<th>` and sets `aria-sort`. The local `SortButton` this replaced
 * had neither: it showed the same up-and-down icon on every column, so there
 * was no way — by eye or by screen reader — to tell which column was sorted.
 */
const H2H_SORTABLE_COLUMNS: {
  field: SortField;
  label: string;
  align: 'left' | 'center';
}[] = [
  { field: 'opponent_name', label: 'Opponent', align: 'left' },
  { field: 'wins', label: 'W-L', align: 'center' },
  { field: 'win_pct', label: 'Win%', align: 'center' },
  { field: 'matches_played', label: 'Matches', align: 'center' },
  { field: 'game_wins', label: 'Game W-L', align: 'center' },
];

const H2HTableHeader: React.FC<{
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}> = ({ sortField, sortDirection, onSort }) => (
  <TableHeader>
    <TableRow>
      {H2H_SORTABLE_COLUMNS.map((column) => (
        <SortableColumnHeader
          key={column.field}
          field={column.field}
          activeField={sortField}
          direction={sortDirection}
          onSort={onSort}
          align={column.align}
          icon="arrow"
        >
          {column.label}
        </SortableColumnHeader>
      ))}
      <TableHead>Last Played</TableHead>
      <TableHead className="text-right">Action</TableHead>
    </TableRow>
  </TableHeader>
);

/** The opponent's logo, or their initial when they have none. */
const OpponentAvatar: React.FC<{ record: HeadToHeadRecord }> = ({ record }) =>
  record.opponent_image_url ? (
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
  );

/** Opens the opponent's team page. A real button, so Enter and Tab are free. */
const OpponentButton: React.FC<{ record: HeadToHeadRecord; onClick: () => void }> = ({
  record,
  onClick,
}) => {
  const rivalryType = getRivalryType(record);
  const badge = rivalryType ? rivalryBadgeConfig[rivalryType] : null;

  return (
    <Button
      variant="ghost"
      aria-label={`View team details for ${record.opponent_name}`}
      className="flex h-auto min-h-6 w-full items-center justify-start space-x-3 rounded-md p-1 text-left font-normal hover:bg-muted/30"
      onClick={onClick}
    >
      <OpponentAvatar record={record} />
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium hover:text-primary transition-colors truncate">
          {record.opponent_name}
        </span>
        {badge && (
          <span
            className={cn(
              'text-xs font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap',
              badge.className
            )}
          >
            {badge.label}
          </span>
        )}
      </div>
    </Button>
  );
};

const WinLossCell: React.FC<{ record: HeadToHeadRecord }> = ({ record }) => (
  <div className="flex items-center justify-center space-x-1">
    <Trophy className="size-3 text-emerald-500" />
    <span className="text-emerald-600 font-medium">{record.wins}</span>
    <span>-</span>
    <X className="size-3 text-rose-500" />
    <span className="text-rose-600 font-medium">{record.losses}</span>
  </div>
);

const LastPlayedCell: React.FC<{ lastPlayedAt: string | null }> = ({ lastPlayedAt }) => {
  if (!lastPlayedAt) return <>-</>;

  return (
    <div className="flex items-center space-x-1">
      <Calendar className="size-3" />
      <span>{formatWithPattern(lastPlayedAt, 'MMM d, yyyy')}</span>
    </div>
  );
};

const H2HTableRow: React.FC<{
  record: HeadToHeadRecord;
  onOpponentClick: (opponentId: string, opponentName: string) => void;
  onViewDetails: (opponent: { id: string; name: string }) => void;
}> = ({ record, onOpponentClick, onViewDetails }) => (
  <TableRow>
    <TableCell>
      <OpponentButton
        record={record}
        onClick={() => onOpponentClick(record.opponent_id, record.opponent_name)}
      />
    </TableCell>
    <TableCell className="text-center">
      <WinLossCell record={record} />
    </TableCell>
    <TableCell className="text-center">
      <Badge variant={record.win_pct >= 50 ? 'default' : 'secondary'}>
        {Number(record.win_pct).toFixed(1)}%
      </Badge>
    </TableCell>
    <TableCell className="text-center font-mono">{record.matches_played}</TableCell>
    <TableCell className="text-center font-mono">
      {record.game_wins}-{record.game_losses}
    </TableCell>
    <TableCell className="text-sm text-muted-foreground">
      <LastPlayedCell lastPlayedAt={record.last_played_at} />
    </TableCell>
    <TableCell className="text-right">
      {record.opponent_id && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails({ id: record.opponent_id, name: record.opponent_name })}
        >
          View Details
        </Button>
      )}
    </TableCell>
  </TableRow>
);

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
            No opponents found matching &quot;{searchTerm}&quot;
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
          /* Desktop: the shared table primitive */
          <Table>
            <TableCaption className="sr-only">
              Head-to-head record against every opponent
            </TableCaption>
            <H2HTableHeader
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TableBody>
              {filteredRecords.map((record) => (
                <H2HTableRow
                  key={record.opponent_name}
                  record={record}
                  onOpponentClick={handleTeamClick}
                  onViewDetails={setSelectedOpponent}
                />
              ))}
            </TableBody>
          </Table>
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
