import React from 'react';

import {
  RECAP_GRAPHIC_HEIGHT,
  RECAP_GRAPHIC_WIDTH,
  recapColors,
  recapFonts,
  recapSpacing,
} from './recapGraphicTokens';

interface RecapGraphicFrameProps {
  /** e.g. "Week 6" */
  weekLabel: string;
  /** e.g. "Fall 2026" */
  seasonName: string;
  /** e.g. "Division Standings" */
  kicker: string;
  children: React.ReactNode;
}

/**
 * The shared 1080x1350 surface every recap graphic is drawn on.
 *
 * Fixed pixel dimensions, not a responsive layout: this element is captured to
 * a PNG at exactly this size, and Instagram's 4:5 target is 1080x1350. Styles
 * are inline and literal so nothing depends on Tailwind's theme layer at
 * capture time.
 */
const RecapGraphicFrame: React.FC<RecapGraphicFrameProps> = ({
  weekLabel,
  seasonName,
  kicker,
  children,
}) => (
  <div
    style={{
      width: RECAP_GRAPHIC_WIDTH,
      height: RECAP_GRAPHIC_HEIGHT,
      backgroundColor: recapColors.navy,
      color: recapColors.cream,
      fontFamily: recapFonts.body,
      display: 'flex',
      flexDirection: 'column',
      padding: recapSpacing.gutter,
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <header style={{ flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <span
          style={{
            fontFamily: recapFonts.display,
            fontSize: 44,
            letterSpacing: '0.12em',
            color: recapColors.cream,
          }}
        >
          717REC
        </span>
        <span
          style={{
            fontFamily: recapFonts.body,
            fontSize: 22,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: recapColors.muted,
          }}
        >
          {seasonName}
        </span>
      </div>

      <div
        style={{
          marginTop: 28,
          height: 4,
          backgroundColor: recapColors.wood,
          width: 120,
          borderRadius: 2,
        }}
      />

      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontFamily: recapFonts.heading,
            fontSize: 26,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: recapColors.wood,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: recapFonts.display,
            fontSize: 104,
            lineHeight: 1,
            letterSpacing: '0.02em',
            marginTop: 6,
          }}
        >
          {weekLabel}
        </div>
      </div>
    </header>

    <main
      style={{
        flex: 1,
        minHeight: 0,
        marginTop: recapSpacing.blockGap,
        display: 'flex',
        flexDirection: 'column',
        gap: recapSpacing.blockGap,
      }}
    >
      {children}
    </main>

    <footer
      style={{
        flexShrink: 0,
        marginTop: 24,
        paddingTop: 20,
        borderTop: `1px solid ${recapColors.hairline}`,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 20,
        letterSpacing: '0.06em',
        color: recapColors.muted,
        textTransform: 'uppercase',
      }}
    >
      <span>717rec.app</span>
      <span>Where Bags Fly and Beers Flow</span>
    </footer>
  </div>
);

export default RecapGraphicFrame;
