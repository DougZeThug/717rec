import { ArrowDown, ArrowUp, ChevronDown, Minus } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { PowerMigrationComparisonRow } from '@/hooks/admin/buildPowerMigrationComparison';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

const formatScore = (score: number | null): string => (score == null ? '—' : score.toFixed(1));

const RankMovement: React.FC<{ delta: number | null }> = ({ delta }) => {
  if (delta == null || delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3" aria-hidden="true" />
        {delta === 0 ? 'same' : ''}
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        up ? 'text-emerald-500' : 'text-red-500'
      )}
    >
      {up ? (
        <ArrowUp className="size-3" aria-hidden="true" />
      ) : (
        <ArrowDown className="size-3" aria-hidden="true" />
      )}
      {Math.abs(delta)}
    </span>
  );
};

/**
 * Before/after Career Standings table, sorted by the new (after) rank.
 * Each row expands into a per-season breakdown of the backed-up vs live values.
 */
const ComparisonTable: React.FC<{ rows: PowerMigrationComparisonRow[] }> = ({ rows }) => {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (teamId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No teams to compare.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-2 sm:px-3">Rank</th>
            <th className="px-2 py-2 sm:px-3">Team</th>
            {!isMobile && <th className="px-3 py-2">Division</th>}
            <th className="px-2 py-2 text-right sm:px-3">Before</th>
            <th className="px-2 py-2 text-right sm:px-3">After</th>
            <th className="px-2 py-2 text-right sm:px-3">Change</th>
            <th className="w-8 px-1 py-2" aria-label="Details" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expanded.has(row.teamId);
            return (
              <React.Fragment key={row.teamId}>
                <tr className="border-b border-border last:border-b-0">
                  <td className="px-2 py-2 tabular-nums sm:px-3">
                    <span className="text-muted-foreground">{row.beforeRank ?? '—'}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-medium">{row.afterRank}</span>{' '}
                    <RankMovement delta={row.rankDelta} />
                  </td>
                  <td className="px-2 py-2 font-medium sm:px-3">
                    {row.teamName}
                    {row.isNewSinceBackup && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        New since backup
                      </Badge>
                    )}
                  </td>
                  {!isMobile && (
                    <td className="px-3 py-2 text-muted-foreground">{row.divisionName ?? '—'}</td>
                  )}
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground sm:px-3">
                    {formatScore(row.beforeScore)}
                  </td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums sm:px-3">
                    {formatScore(row.afterScore)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2 text-right tabular-nums sm:px-3',
                      row.scoreDelta == null || Math.abs(row.scoreDelta) < 0.05
                        ? 'text-muted-foreground'
                        : row.scoreDelta > 0
                          ? 'text-emerald-500'
                          : 'text-red-500'
                    )}
                  >
                    {row.scoreDelta == null
                      ? '—'
                      : `${row.scoreDelta >= 0 ? '+' : ''}${row.scoreDelta.toFixed(1)}`}
                  </td>
                  <td className="px-1 py-2">
                    {row.perSeason.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggle(row.teamId)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Hide' : 'Show'} season details for ${row.teamName}`}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <ChevronDown
                          className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
                        />
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-border bg-muted/20 last:border-b-0">
                    <td colSpan={isMobile ? 6 : 7} className="px-3 py-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-1 pr-3 font-medium">Season</th>
                            <th className="py-1 pr-3 font-medium">Record before → after</th>
                            <th className="py-1 font-medium">Power before → after</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.perSeason.map((season) => (
                            <tr key={season.seasonId}>
                              <td className="py-1 pr-3">{season.seasonName}</td>
                              <td className="py-1 pr-3 tabular-nums">
                                {season.beforeRecord ?? '—'} → {season.afterRecord ?? '—'}
                              </td>
                              <td className="py-1 tabular-nums">
                                {formatScore(season.beforePower)} → {formatScore(season.afterPower)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
