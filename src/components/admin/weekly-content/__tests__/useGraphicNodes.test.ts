import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecapDivisionFact, RecapFactsV1, RecapTeamGrade } from '@/types/recapEdition';

import { useGraphicNodes } from '../useGraphicNodes';

const team = (rank: number): RecapTeamGrade => ({
  rank,
  previousRank: rank,
  teamId: `t-${rank}`,
  teamName: `Team ${rank}`,
  logoUrl: null,
  division: 'Competitive',
  grade: 'B',
  gpa: 3,
  categories: [],
  wins: 4,
  losses: 2,
  powerScore: 60,
  delta: null,
});

const division = (id: string, name: string): RecapDivisionFact => ({
  divisionId: id,
  divisionName: name,
  standings: [],
});

const facts = (overrides: Partial<RecapFactsV1> = {}): RecapFactsV1 => ({
  factsSchemaVersion: 2,
  seasonId: 's-1',
  seasonName: 'Fall 2026',
  seasonSlug: 'fall-2026',
  weekNumber: 6,
  weekStartIso: '2026-10-09T04:00:00.000Z',
  weekEndIso: '2026-10-16T04:00:00.000Z',
  upsets: [],
  hotStreaks: [],
  movers: { basis: 'compared', currentWeek: 6, previousWeek: 5, risers: [], faller: null },
  teamOfTheWeek: null,
  divisions: [],
  powerRankings: [],
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
  ...overrides,
});

/** A stand-in for a mounted off-screen graphic. */
const node = () => document.createElement('div');

describe('useGraphicNodes', () => {
  it('exports nothing before a week has been generated', () => {
    const { result } = renderHook(() => useGraphicNodes(null));
    expect(result.current.buildRequests()).toEqual([]);
  });

  it('names the summary after the season and week', () => {
    const { result } = renderHook(() => useGraphicNodes(facts()));
    result.current.summaryRef.current = node();

    expect(result.current.buildRequests()).toEqual([
      expect.objectContaining({ fileName: '717rec-fall-2026-week-6-recap' }),
    ]);
  });

  it('numbers the ranking pages and puts them before the division tables', () => {
    const { result } = renderHook(() =>
      useGraphicNodes(
        facts({
          powerRankings: Array.from({ length: 26 }, (_, i) => team(i + 1)),
          divisions: [division('d-1', 'Competitive')],
        })
      )
    );

    result.current.summaryRef.current = node();
    for (const page of [1, 2, 3]) result.current.setRankingRef(page)(node());
    result.current.setDivisionRef('d-1')(node());

    // Rankings lead the post, so they export before the standings.
    expect(result.current.buildRequests().map((r) => r.fileName)).toEqual([
      '717rec-fall-2026-week-6-recap',
      '717rec-fall-2026-week-6-rankings-1',
      '717rec-fall-2026-week-6-rankings-2',
      '717rec-fall-2026-week-6-rankings-3',
      '717rec-fall-2026-week-6-standings-competitive',
    ]);
  });

  it('slugs a division name with spaces and punctuation', () => {
    const { result } = renderHook(() =>
      useGraphicNodes(facts({ divisions: [division('d-1', 'Rec / Social')] }))
    );
    result.current.setDivisionRef('d-1')(node());

    expect(result.current.buildRequests()[0].fileName).toBe(
      '717rec-fall-2026-week-6-standings-rec-social'
    );
  });

  it('skips a graphic whose node never mounted, rather than exporting a blank', () => {
    const { result } = renderHook(() =>
      useGraphicNodes(
        facts({
          powerRankings: [team(1), team(2)],
          divisions: [division('d-1', 'Competitive'), division('d-2', 'Intermediate')],
        })
      )
    );

    result.current.setDivisionRef('d-1')(node());
    // d-2 and the ranking page are never given a node.

    expect(result.current.buildRequests().map((r) => r.fileName)).toEqual([
      '717rec-fall-2026-week-6-standings-competitive',
    ]);
  });

  it('drops a node again when its component unmounts', () => {
    const { result } = renderHook(() =>
      useGraphicNodes(facts({ divisions: [division('d-1', 'Competitive')] }))
    );

    result.current.setDivisionRef('d-1')(node());
    expect(result.current.buildRequests()).toHaveLength(1);

    result.current.setDivisionRef('d-1')(null);
    expect(result.current.buildRequests()).toEqual([]);
  });

  it('exports nothing for an edition that has no rankings', () => {
    const { result } = renderHook(() => useGraphicNodes(facts({ powerRankings: undefined })));
    result.current.setRankingRef(1)(node());

    // No ranked teams means no ranking pages, whatever refs are lying around.
    expect(result.current.buildRequests()).toEqual([]);
  });
});
