import { useCallback, useRef } from 'react';

import { paginateRankings } from '@/components/recap/graphics/powerRankingPages';
import type { RecapFactsV1 } from '@/types/recapEdition';

import type { ExportRequest } from './export/useGraphicExport';

/**
 * Keeps a handle on each off-screen graphic so the export knows what to capture
 * and what to call the file.
 */
export const useGraphicNodes = (facts: RecapFactsV1 | null) => {
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const divisionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const rankingRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const setDivisionRef = useCallback(
    (divisionId: string) => (node: HTMLDivElement | null) => {
      divisionRefs.current.set(divisionId, node);
    },
    []
  );

  const setRankingRef = useCallback(
    (page: number) => (node: HTMLDivElement | null) => {
      rankingRefs.current.set(page, node);
    },
    []
  );

  const buildRequests = useCallback((): ExportRequest[] => {
    if (!facts) return [];

    const base = `717rec-${facts.seasonSlug}-week-${facts.weekNumber}`;
    const requests: ExportRequest[] = [];

    if (summaryRef.current) {
      requests.push({ node: summaryRef.current, fileName: `${base}-recap` });
    }

    // Rankings before the division tables: they are the lead image of the post.
    for (const page of paginateRankings(facts.powerRankings ?? [])) {
      const node = rankingRefs.current.get(page.page);
      if (!node) continue;
      requests.push({ node, fileName: `${base}-rankings-${page.page}` });
    }

    for (const division of facts.divisions) {
      const node = divisionRefs.current.get(division.divisionId);
      if (!node) continue;
      const slug = division.divisionName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      requests.push({ node, fileName: `${base}-standings-${slug}` });
    }

    return requests;
  }, [facts]);

  return { summaryRef, setDivisionRef, setRankingRef, buildRequests };
};
