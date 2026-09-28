import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ExportRequest } from '@/components/admin/weekly-content/export/useGraphicExport';
import type { RecapFactsV1 } from '@/types/recapEdition';

vi.mock('@/components/recap/graphics/RecapSummaryGraphic', () => ({
  default: () => <div>summary</div>,
}));
vi.mock('@/components/recap/graphics/PowerRankingsGraphic', () => ({
  default: () => <div>rankings</div>,
}));
vi.mock('@/components/recap/graphics/DivisionStandingsGraphic', () => ({
  default: () => <div>standings</div>,
}));
vi.mock('@/components/recap/graphics/powerRankingPages', () => ({
  paginateRankings: () => [{ page: 1 }, { page: 2 }],
}));

import PackExportSurface from '../PackExportSurface';
import { useGraphicNodes } from '../useGraphicNodes';

const facts = {
  seasonSlug: 'fall-2026',
  seasonName: 'Fall 2026',
  weekNumber: 3,
  powerRankings: [],
  divisions: [{ divisionId: 'div-a', divisionName: 'Division A' }],
} as unknown as RecapFactsV1;

/**
 * Reads the requests in its own layout effect. A parent's layout effect runs
 * after its children's layout effects but before any passive effect, which is
 * where the export's single requestAnimationFrame can resume on a fast render.
 */
const Harness = ({ onCommit }: { onCommit: (requests: ExportRequest[]) => void }) => {
  const { summaryRef, setDivisionRef, setRankingRef, buildRequests } = useGraphicNodes(facts);

  React.useLayoutEffect(() => {
    onCommit(buildRequests());
  }, [buildRequests, onCommit]);

  return (
    <PackExportSurface
      facts={facts}
      headline="Week 3"
      blurbs={{}}
      resolveLogo={() => null}
      summaryRef={summaryRef}
      setDivisionRef={setDivisionRef}
      setRankingRef={setRankingRef}
    />
  );
};

describe('PackExportSurface', () => {
  it('registers every graphic by the end of the commit, not just the summary', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    const requests: ExportRequest[] = onCommit.mock.calls[0][0];
    expect(requests.map((request) => request.fileName)).toEqual([
      '717rec-fall-2026-week-3-recap',
      '717rec-fall-2026-week-3-rankings-1',
      '717rec-fall-2026-week-3-rankings-2',
      '717rec-fall-2026-week-3-standings-division-a',
    ]);
  });
});
