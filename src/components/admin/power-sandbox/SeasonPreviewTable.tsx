import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SeasonDivisionPreview } from '@/hooks/admin/buildSeasonWeightPreview';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

import { formatDelta, formatScore } from './previewFormat';
import RankDeltaBadge from './RankDeltaBadge';

interface SeasonPreviewTableProps {
  divisions: SeasonDivisionPreview[];
}

/**
 * Current-season standings per division, today's weights vs. the candidate.
 * The Hidden division never appears in public standings, so it is skipped
 * here too. Score columns collapse away on mobile, like the migration table.
 */
const SeasonPreviewTable: React.FC<SeasonPreviewTableProps> = ({ divisions }) => {
  const isMobile = useIsMobile();
  const visible = divisions.filter((division) => division.divisionName !== 'Hidden');

  if (visible.every((division) => division.rows.length === 0)) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No rated teams this season yet — the preview fills in once matches are played.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((division) => (
        <div key={division.divisionName} className="space-y-1">
          <h4 className="text-sm font-semibold">{division.divisionName}</h4>
          {division.rows.length > 0 && (
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
                  {division.rows.map((row) => (
                    <TableRow key={row.teamId}>
                      <TableCell className="py-2">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          {row.baselineRank} → {row.candidateRank}
                          <RankDeltaBadge delta={row.rankDelta} />
                        </span>
                      </TableCell>
                      <TableCell className="py-2 font-medium">{row.teamName}</TableCell>
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
          )}
          {division.unrated.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Not rated yet (no matches): {division.unrated.map((team) => team.teamName).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default SeasonPreviewTable;
