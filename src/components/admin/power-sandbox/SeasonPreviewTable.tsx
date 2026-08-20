import React from 'react';

import { SeasonDivisionPreview } from '@/hooks/admin/buildSeasonWeightPreview';

import PreviewRankingTable from './PreviewRankingTable';

interface SeasonPreviewTableProps {
  divisions: SeasonDivisionPreview[];
}

/**
 * Current-season standings per division, today's weights vs. the candidate.
 * The Hidden division never appears in public standings, so it is skipped
 * here too.
 */
const SeasonPreviewTable: React.FC<SeasonPreviewTableProps> = ({ divisions }) => {
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
          {division.rows.length > 0 && <PreviewRankingTable rows={division.rows} />}
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
