import React from 'react';

import DivisionStandingsGraphic from '@/components/recap/graphics/DivisionStandingsGraphic';
import { paginateRankings } from '@/components/recap/graphics/powerRankingPages';
import PowerRankingsGraphic from '@/components/recap/graphics/PowerRankingsGraphic';
import RecapSummaryGraphic from '@/components/recap/graphics/RecapSummaryGraphic';
import type { RecapFactsV1 } from '@/types/recapEdition';

import type { LogoResolver } from './export/inlineImages';
import OffscreenGraphic from './export/OffscreenGraphic';

interface PackExportSurfaceProps {
  facts: RecapFactsV1;
  headline: string;
  resolveLogo: LogoResolver;
  blurbs: Record<string, string>;
  summaryRef: React.MutableRefObject<HTMLDivElement | null>;
  setDivisionRef: (divisionId: string) => (node: HTMLDivElement | null) => void;
  setRankingRef: (page: number) => (node: HTMLDivElement | null) => void;
}

/** Small wrapper so each graphic can own a ref without breaking hook rules. */
const KeyedExportNode = <K,>({
  nodeKey,
  setRef,
  children,
}: {
  nodeKey: K;
  setRef: (key: K) => (node: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const assign = setRef(nodeKey);

  React.useEffect(() => {
    assign(ref.current);
    return () => assign(null);
  }, [assign]);

  return <OffscreenGraphic innerRef={ref}>{children}</OffscreenGraphic>;
};

/**
 * The full-size copies that get captured.
 *
 * Mounted only while an export is running, so the logo fetches do not fire for
 * an admin who never presses Download.
 */
const PackExportSurface: React.FC<PackExportSurfaceProps> = ({
  facts,
  headline,
  blurbs,
  resolveLogo,
  summaryRef,
  setDivisionRef,
  setRankingRef,
}) => (
  <>
    <OffscreenGraphic innerRef={summaryRef}>
      <RecapSummaryGraphic facts={facts} headline={headline} resolveLogo={resolveLogo} />
    </OffscreenGraphic>

    {paginateRankings(facts.powerRankings ?? []).map((page) => (
      <KeyedExportNode key={page.page} nodeKey={page.page} setRef={setRankingRef}>
        <PowerRankingsGraphic
          page={page}
          seasonName={facts.seasonName}
          weekNumber={facts.weekNumber}
          blurbs={blurbs}
          resolveLogo={resolveLogo}
        />
      </KeyedExportNode>
    ))}

    {facts.divisions.map((division) => (
      <KeyedExportNode
        key={division.divisionId}
        nodeKey={division.divisionId}
        setRef={setDivisionRef}
      >
        <DivisionStandingsGraphic
          division={division}
          seasonName={facts.seasonName}
          weekNumber={facts.weekNumber}
          resolveLogo={resolveLogo}
        />
      </KeyedExportNode>
    ))}
  </>
);

export default PackExportSurface;
