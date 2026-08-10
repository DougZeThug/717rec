import { ChevronDown, ChevronRight, Minus, MoveDown, MoveUp } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PerSeasonComparison,
  PowerMigrationComparisonRow,
} from '@/hooks/admin/buildPowerMigrationComparison';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

interface ComparisonTableProps {
  rows: PowerMigrationComparisonRow[];
}

/** Render a 0-100 power score to one decimal, with a dash for "no data". */
const formatScore = (score: number | null): string => (score === null ? '—' : score.toFixed(1));

/** Render a signed score delta to one decimal, with a dash for "no data". */
const formatDelta = (delta: number | null): string => {
  if (delta === null) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
};

/** "old rank → new rank" with a colored up/down arrow for the movement. */
const RankChange: React.FC<{ row: PowerMigrationComparisonRow }> = ({ row }) => {
  if (row.beforeRank === null || row.rankDelta === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {row.beforeRank} → {row.afterRank}
      {row.rankDelta > 0 && (
        <span className="inline-flex items-center text-emerald-500">
          <MoveUp className="size-3" aria-hidden="true" />
          {row.rankDelta}
        </span>
      )}
      {row.rankDelta < 0 && (
        <span className="inline-flex items-center text-red-500">
          <MoveDown className="size-3" aria-hidden="true" />
          {Math.abs(row.rankDelta)}
        </span>
      )}
      {row.rankDelta === 0 && <Minus className="size-3 text-muted-foreground" aria-hidden="true" />}
    </span>
  );
};

/** Season-by-season old/new record and power score for one expanded team. */
const PerSeasonDetail: React.FC<{ perSeason: PerSeasonComparison[] }> = ({ perSeason }) => {
  if (perSeason.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        No completed-season history for this team.
      </p>
    );
  }
  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="h-8">Season</TableHead>
          <TableHead className="h-8">Old record</TableHead>
          <TableHead className="h-8">New record</TableHead>
          <TableHead className="h-8 text-right">Old score</TableHead>
          <TableHead className="h-8 text-right">New score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {perSeason.map((season) => (
          <TableRow key={season.seasonId}>
            <TableCell className="py-1.5">{season.seasonName}</TableCell>
            <TableCell className="py-1.5 tabular-nums">
              {season.beforeWins === null ? '—' : `${season.beforeWins}-${season.beforeLosses}`}
            </TableCell>
            <TableCell className="py-1.5 tabular-nums">
              {season.afterWins === null ? '—' : `${season.afterWins}-${season.afterLosses}`}
            </TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">
              {formatScore(season.beforePowerScore)}
            </TableCell>
            <TableCell className="py-1.5 text-right tabular-nums">
              {formatScore(season.afterPowerScore)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/** Column headers; the score columns collapse away on mobile. */
const HeaderRow: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <TableRow>
    <TableHead className="w-8" aria-label="Expand" />
    <TableHead>Team</TableHead>
    <TableHead>Rank</TableHead>
    {!isMobile && <TableHead className="text-right">Old score</TableHead>}
    {!isMobile && <TableHead className="text-right">New score</TableHead>}
    <TableHead className="text-right">Change</TableHead>
  </TableRow>
);

interface TeamRowGroupProps {
  row: PowerMigrationComparisonRow;
  isMobile: boolean;
  expanded: boolean;
  onToggle: (teamId: string) => void;
}

/** One team's comparison row plus, when expanded, its per-season detail row. */
const TeamRowGroup: React.FC<TeamRowGroupProps> = ({ row, isMobile, expanded, onToggle }) => {
  const columnCount = isMobile ? 4 : 6;
  return (
    <>
      <TableRow
        onClick={() => onToggle(row.teamId)}
        className="cursor-pointer"
        aria-expanded={expanded}
      >
        <TableCell className="py-2">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
        </TableCell>
        <TableCell className="py-2">
          <span className="font-medium">{row.teamName}</span>
          {!isMobile && row.divisionName && (
            <span className="ml-2 text-xs text-muted-foreground">{row.divisionName}</span>
          )}
          {row.isNewSinceBackup && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              New since backup
            </Badge>
          )}
        </TableCell>
        <TableCell className="py-2">
          <RankChange row={row} />
        </TableCell>
        {!isMobile && (
          <TableCell className="py-2 text-right tabular-nums">
            {formatScore(row.beforeScore)}
          </TableCell>
        )}
        {!isMobile && (
          <TableCell className="py-2 text-right tabular-nums">
            {formatScore(row.afterScore)}
          </TableCell>
        )}
        <TableCell
          className={cn(
            'py-2 text-right tabular-nums',
            row.scoreDelta !== null && row.scoreDelta > 0 && 'text-emerald-500',
            row.scoreDelta !== null && row.scoreDelta < 0 && 'text-red-500'
          )}
        >
          {formatDelta(row.scoreDelta)}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={columnCount} className="py-2 pl-10">
            {isMobile && (
              <p className="text-xs text-muted-foreground mb-1 tabular-nums">
                Career score: {formatScore(row.beforeScore)} → {formatScore(row.afterScore)}
              </p>
            )}
            <PerSeasonDetail perSeason={row.perSeason} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

/**
 * Career Standings before/after the power-score migration, sorted by the new
 * (after) ranking. Rows expand to a per-season breakdown.
 */
const ComparisonTable: React.FC<ComparisonTableProps> = ({ rows }) => {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (teamId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <HeaderRow isMobile={isMobile} />
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TeamRowGroup
              key={row.teamId}
              row={row}
              isMobile={isMobile}
              expanded={expanded.has(row.teamId)}
              onToggle={toggle}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ComparisonTable;
