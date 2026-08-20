import React from 'react';

import { CareerPreviewRow } from '@/hooks/admin/buildCareerWeightPreview';

import PreviewRankingTable from './PreviewRankingTable';

interface CareerPreviewTableProps {
  rows: CareerPreviewRow[];
}

/**
 * Full career standings (all teams, one flat list — the same population
 * /stats ranks), today's weights vs. the candidate. The division shows as a
 * muted note next to the team name.
 */
const CareerPreviewTable: React.FC<CareerPreviewTableProps> = ({ rows }) => {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No career history to preview yet.</p>;
  }

  return <PreviewRankingTable rows={rows.map((row) => ({ ...row, teamNote: row.divisionName }))} />;
};

export default CareerPreviewTable;
