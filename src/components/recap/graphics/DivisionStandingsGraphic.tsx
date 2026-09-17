import React from 'react';

import type { RecapDivisionFact } from '@/types/recapEdition';

import GraphicTeamMark from './GraphicTeamMark';
import RecapGraphicFrame from './RecapGraphicFrame';
import { recapColors, recapFonts } from './recapGraphicTokens';

interface DivisionStandingsGraphicProps {
  division: RecapDivisionFact;
  seasonName: string;
  weekNumber: number;
  /** Swapped for a data URL during export; identity on screen. */
  resolveLogo?: (url: string | null) => string | null;
}

const formatDelta = (delta: number | null): { text: string; color: string } => {
  if (delta === null) return { text: '—', color: recapColors.muted };
  if (delta > 0.05) return { text: `+${delta.toFixed(1)}`, color: recapColors.rise };
  if (delta < -0.05) return { text: delta.toFixed(1), color: recapColors.fall };
  // Anything inside the rounding band reads as flat rather than "+0.0", which
  // looks like a bug.
  return { text: '—', color: recapColors.muted };
};

/**
 * One division's table, sized to be readable when posted rather than cramming
 * the whole league onto one image.
 *
 * Rows are already ordered and ranked by buildRecapFacts, using the same rule
 * /stats applies, so this component never re-sorts.
 */
const DivisionStandingsGraphic: React.FC<DivisionStandingsGraphicProps> = ({
  division,
  seasonName,
  weekNumber,
  resolveLogo = (url) => url,
}) => {
  // Ten rows is what fits at a size that survives a phone screen.
  const rows = division.standings.slice(0, 10);

  return (
    <RecapGraphicFrame
      seasonName={seasonName}
      kicker={`${division.divisionName} Standings`}
      weekLabel={`Week ${weekNumber}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            paddingBottom: 14,
            borderBottom: `1px solid ${recapColors.hairline}`,
            fontSize: 19,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: recapColors.muted,
          }}
        >
          <span style={{ width: 44 }}>#</span>
          <span style={{ flex: 1 }}>Team</span>
          <span style={{ width: 110, textAlign: 'right' }}>W–L</span>
          <span style={{ width: 130, textAlign: 'right' }}>Power</span>
          <span style={{ width: 96, textAlign: 'right' }}>Week</span>
        </div>

        {rows.map((row) => {
          const delta = formatDelta(row.delta);
          return (
            <div
              key={row.teamId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '17px 0',
                borderBottom: `1px solid ${recapColors.hairline}`,
              }}
            >
              <span
                style={{
                  width: 44,
                  fontFamily: recapFonts.display,
                  fontSize: 38,
                  color: row.rank <= 3 ? recapColors.wood : recapColors.muted,
                }}
              >
                {row.rank}
              </span>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                <GraphicTeamMark
                  teamName={row.teamName}
                  logoSrc={resolveLogo(row.logoUrl)}
                  size={52}
                />
                <span
                  style={{
                    fontFamily: recapFonts.heading,
                    fontSize: 32,
                    // A long name must not push the numbers off the image.
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.teamName}
                </span>
              </div>

              <span
                style={{
                  width: 110,
                  textAlign: 'right',
                  fontFamily: recapFonts.numeric,
                  fontSize: 28,
                }}
              >
                {row.wins}–{row.losses}
              </span>
              <span
                style={{
                  width: 130,
                  textAlign: 'right',
                  fontFamily: recapFonts.numeric,
                  fontSize: 30,
                  fontWeight: 600,
                }}
              >
                {row.powerScore === null ? '—' : row.powerScore.toFixed(1)}
              </span>
              <span
                style={{
                  width: 96,
                  textAlign: 'right',
                  fontFamily: recapFonts.numeric,
                  fontSize: 26,
                  color: delta.color,
                }}
              >
                {delta.text}
              </span>
            </div>
          );
        })}
      </div>
    </RecapGraphicFrame>
  );
};

export default DivisionStandingsGraphic;
