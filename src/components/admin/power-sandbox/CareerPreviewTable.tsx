import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CareerPreviewRow } from '@/hooks/admin/buildCareerWeightPreview';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

import { formatDelta, formatScore } from './previewFormat';
import RankDeltaBadge from './RankDeltaBadge';

interface CareerPreviewTableProps {
  rows: CareerPreviewRow[];
}

/**
 * Full career standings (all teams, one flat list — the same population
 * /stats ranks), today's weights vs. the candidate.
 */
const CareerPreviewTable: React.FC<CareerPreviewTableProps> = ({ rows }) => {
  const isMobile = useIsMobile();

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No career history to preview yet.</p>;
  }

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Team</TableHead>
            {!isMobile && <TableHead className="text-right">Score now</TableHead>}
            {!isMobile && <TableHead className="text-right">Score preview</TableHead>}
            <TableHead className="text-right">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.teamId}>
              <TableCell className="py-2">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  {row.baselineRank} → {row.candidateRank}
                  <RankDeltaBadge delta={row.rankDelta} />
                </span>
              </TableCell>
              <TableCell className="py-2">
                <span className="font-medium">{row.teamName}</span>
                {!isMobile && row.divisionName && (
                  <span className="ml-2 text-xs text-muted-foreground">{row.divisionName}</span>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CareerPreviewTable;
