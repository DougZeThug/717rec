import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

import { formatDelta, formatScore } from './previewFormat';
import RankDeltaBadge from './RankDeltaBadge';

/** One ranked line of a preview table — season and career rows both fit it. */
interface PreviewRankingRow {
  teamId: string;
  teamName: string;
  /** Muted note next to the name on desktop (career rows show the division) */
  teamNote?: string | null;
  baselineScore: number;
  candidateScore: number;
  baselineRank: number;
  candidateRank: number;
  /** baselineRank - candidateRank: positive means the team moves UP */
  rankDelta: number;
  scoreDelta: number;
}

/** Column headers; the score columns collapse away on mobile. */
const HeaderRow: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <TableRow>
    <TableHead>Rank</TableHead>
    <TableHead>Team</TableHead>
    {!isMobile && <TableHead className="text-right">Score now</TableHead>}
    {!isMobile && <TableHead className="text-right">Score preview</TableHead>}
    <TableHead className="text-right">Change</TableHead>
  </TableRow>
);

/** One team's baseline → candidate movement. */
const RankingRow: React.FC<{ row: PreviewRankingRow; isMobile: boolean }> = ({ row, isMobile }) => (
  <TableRow>
    <TableCell className="py-2">
      <span className="inline-flex items-center gap-1 tabular-nums">
        {row.baselineRank} → {row.candidateRank}
        <RankDeltaBadge delta={row.rankDelta} />
      </span>
    </TableCell>
    <TableCell className="py-2">
      <span className="font-medium">{row.teamName}</span>
      {!isMobile && row.teamNote && (
        <span className="ml-2 text-xs text-muted-foreground">{row.teamNote}</span>
      )}
    </TableCell>
    {!isMobile && (
      <TableCell className="py-2 text-right tabular-nums">
        {formatScore(row.baselineScore)}
      </TableCell>
    )}
    {!isMobile && (
      <TableCell className="py-2 text-right tabular-nums">
        {formatScore(row.candidateScore)}
      </TableCell>
    )}
    <TableCell
      className={cn(
        'py-2 text-right tabular-nums',
        row.scoreDelta > 0 && 'text-emerald-500',
        row.scoreDelta < 0 && 'text-red-500'
      )}
    >
      {formatDelta(row.scoreDelta)}
    </TableCell>
  </TableRow>
);

/**
 * Today's weights vs. the candidate, one ranked table. Both preview tabs
 * (per-division season sections and the flat career list) render through
 * this, so the two always look and behave the same.
 */
const PreviewRankingTable: React.FC<{ rows: PreviewRankingRow[] }> = ({ rows }) => {
  const isMobile = useIsMobile();
  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <HeaderRow isMobile={isMobile} />
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <RankingRow key={row.teamId} row={row} isMobile={isMobile} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PreviewRankingTable;
