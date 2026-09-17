import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import type { RecapDivisionFact } from '@/types/recapEdition';

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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="pb-2 w-8">#</th>
              <th className="pb-2">Team</th>
              <th className="pb-2 text-right">W–L</th>
              <th className="pb-2 text-right">Power</th>
            </tr>
          </thead>
          <tbody>
            {division.standings.map((row) => (
              <tr key={row.teamId} className="border-t border-border">
                <td className="py-2 tabular-nums text-muted-foreground">{row.rank}</td>
                <td className="py-2">{row.teamName}</td>
                <td className="py-2 text-right tabular-nums">
                  {row.wins}–{row.losses}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {row.powerScore === null ? '—' : row.powerScore.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  </section>
);

export default DivisionStandingsTable;
