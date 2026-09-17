import React from 'react';

import DivisionStandingsGraphic from '@/components/recap/graphics/DivisionStandingsGraphic';
import GraphicScaler from '@/components/recap/graphics/GraphicScaler';
import RecapSummaryGraphic from '@/components/recap/graphics/RecapSummaryGraphic';
import type { RecapFactsV1 } from '@/types/recapEdition';

interface PackPreviewProps {
  facts: RecapFactsV1;
  headline: string;
  /** Small enough to sit beside the controls; the graphics stay 1080x1350. */
  scale?: number;
}

/**
 * The whole pack in the order it would be posted: the cover first, then one
 * standings image per division.
 *
 * These are the same components the export captures, shrunk with a CSS
 * transform, so what is approved here is what downloads.
 */
const PackPreview: React.FC<PackPreviewProps> = ({ facts, headline, scale = 0.36 }) => (
  <div className="flex flex-col gap-6">
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-2">Weekly wrap</p>
      <GraphicScaler scale={scale}>
        <RecapSummaryGraphic facts={facts} headline={headline} />
      </GraphicScaler>
    </div>

    {facts.divisions.map((division) => (
      <div key={division.divisionId}>
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {division.divisionName} standings
        </p>
        <GraphicScaler scale={scale}>
          <DivisionStandingsGraphic
            division={division}
            seasonName={facts.seasonName}
            weekNumber={facts.weekNumber}
          />
        </GraphicScaler>
      </div>
    ))}
  </div>
);

export default PackPreview;
