import React from 'react';

import DivisionStandingsGraphic from '@/components/recap/graphics/DivisionStandingsGraphic';
import RecapSummaryGraphic from '@/components/recap/graphics/RecapSummaryGraphic';
import type { RecapFactsV1 } from '@/types/recapEdition';

import type { LogoResolver } from './export/inlineImages';
import OffscreenGraphic from './export/OffscreenGraphic';

interface PackExportSurfaceProps {
  facts: RecapFactsV1;
  headline: string;
  resolveLogo: LogoResolver;
  summaryRef: React.MutableRefObject<HTMLDivElement | null>;
  setDivisionRef: (divisionId: string) => (node: HTMLDivElement | null) => void;
}

/**
 * The full-size copies that get captured.
 *
 * Mounted only while an export is running, so the logo fetches do not fire for
 * an admin who never presses Download.
 */
const PackExportSurface: React.FC<PackExportSurfaceProps> = ({
  facts,
  headline,
  resolveLogo,
  summaryRef,
  setDivisionRef,
}) => (
  <>
    <OffscreenGraphic innerRef={summaryRef}>
      <RecapSummaryGraphic facts={facts} headline={headline} resolveLogo={resolveLogo} />
    </OffscreenGraphic>

    {facts.divisions.map((division) => (
      <DivisionExportNode
        key={division.divisionId}
        divisionId={division.divisionId}
        setDivisionRef={setDivisionRef}
      >
        <DivisionStandingsGraphic
          division={division}
          seasonName={facts.seasonName}
          weekNumber={facts.weekNumber}
          resolveLogo={resolveLogo}
        />
      </DivisionExportNode>
    ))}
  </>
);

/** Small wrapper so each division can own a ref without breaking hook rules. */
const DivisionExportNode: React.FC<{
  divisionId: string;
  setDivisionRef: (divisionId: string) => (node: HTMLDivElement | null) => void;
  children: React.ReactNode;
}> = ({ divisionId, setDivisionRef, children }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const assign = setDivisionRef(divisionId);

  React.useEffect(() => {
    assign(ref.current);
    return () => assign(null);
  }, [assign]);

  return <OffscreenGraphic innerRef={ref}>{children}</OffscreenGraphic>;
};

export default PackExportSurface;
