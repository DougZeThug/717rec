import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import type { RecapDivisionFact, RecapStandingsRow } from '@/types/recapEdition';

/** One team's row. Extracted so the table markup stays readable. */
const StandingsRow: React.FC<{ row: RecapStandingsRow }> = ({ row }) => (
  <tr className="border-t border-border">
    <td className="py-2 tabular-nums text-muted-foreground">{row.rank}</td>
    {/* min-w-28 keeps the team column readable (the table scrolls sideways
        instead of squeezing it). The name may break inside a word only when one
        word is too long for the column. */}
    <td className="py-2 min-w-28 [overflow-wrap:anywhere]">{row.teamName}</td>
    <td className="py-2 text-right tabular-nums whitespace-nowrap">
      {row.wins}–{row.losses}
    </td>
    <td className="py-2 text-right tabular-nums">
      {row.powerScore === null ? '—' : row.powerScore.toFixed(1)}
    </td>
  </tr>
);

/** The table itself, so the card wrapping it does not deepen its markup. */
const StandingsGrid: React.FC<{ standings: RecapStandingsRow[] }> = ({ standings }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="text-muted-foreground text-left">
        <th className="pb-2 w-8">#</th>
        <th className="pb-2">Team</th>
        <th className="pb-2 text-right whitespace-nowrap">W–L</th>
        <th className="pb-2 text-right">Power</th>
      </tr>
    </thead>
    <tbody>
      {standings.map((row) => (
        <StandingsRow key={row.teamId} row={row} />
      ))}
    </tbody>
  </table>
);

/**
 * One division's table on the public recap page.
 *
 * Reads the frozen standings rows, already ranked — this never re-sorts.
 */
const DivisionStandingsTable: React.FC<{ division: RecapDivisionFact }> = ({ division }) => (
  <section className="mb-6">
    <h2 className="text-xl font-semibold mb-2">{division.divisionName}</h2>
    <Card>
      <CardContent className="pt-6">
        {/* Scrolls sideways if a phone is too narrow, so a keyboard user must be
            able to reach it (axe scrollable-region-focusable). */}
        <div
          className="overflow-x-auto rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          tabIndex={0}
          role="region"
          aria-label={`${division.divisionName} standings table`}
        >
          <StandingsGrid standings={division.standings} />
        </div>
      </CardContent>
    </Card>
  </section>
);

export default DivisionStandingsTable;
