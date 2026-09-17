import React from 'react';

import type { RecapFactsV1 } from '@/types/recapEdition';

import GraphicTeamMark from './GraphicTeamMark';
import RecapGraphicFrame from './RecapGraphicFrame';
import { recapColors, recapFonts } from './recapGraphicTokens';

interface RecapSummaryGraphicProps {
  facts: RecapFactsV1;
  /** Editable, so an admin can put the week in their own words. */
  headline: string;
  resolveLogo?: (url: string | null) => string | null;
}

interface StoryProps {
  label: string;
  children: React.ReactNode;
}

const Story: React.FC<StoryProps> = ({ label, children }) => (
  <div
    style={{
      backgroundColor: recapColors.navyDeep,
      borderLeft: `6px solid ${recapColors.wood}`,
      borderRadius: 10,
      padding: '22px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    <span
      style={{
        fontFamily: recapFonts.heading,
        fontSize: 20,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: recapColors.wood,
      }}
    >
      {label}
    </span>
    {children}
  </div>
);

const teamLine = (
  teamName: string,
  logoSrc: string | null,
  detail: string,
  detailColor: string = recapColors.muted
) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <GraphicTeamMark teamName={teamName} logoSrc={logoSrc} size={56} />
    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          fontFamily: recapFonts.heading,
          fontSize: 34,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {teamName}
      </div>
      <div style={{ fontSize: 22, color: detailColor, marginTop: 2 }}>{detail}</div>
    </div>
  </div>
);

/**
 * The cover image: the week's headline and up to three standout stories.
 *
 * Only stories that actually exist are drawn. A quiet week shows fewer blocks
 * rather than empty placeholders, and nothing is invented to fill the space.
 */
const RecapSummaryGraphic: React.FC<RecapSummaryGraphicProps> = ({
  facts,
  headline,
  resolveLogo = (url) => url,
}) => {
  const topUpset = facts.upsets[0];
  const topStreak = facts.hotStreaks[0];
  const mover = facts.teamOfTheWeek ?? facts.movers.risers[0] ?? null;

  return (
    <RecapGraphicFrame
      seasonName={facts.seasonName}
      kicker="Weekly Wrap"
      weekLabel={`Week ${facts.weekNumber}`}
    >
      {headline.trim() !== '' && (
        <div
          style={{
            fontFamily: recapFonts.heading,
            fontSize: 46,
            lineHeight: 1.16,
            color: recapColors.cream,
          }}
        >
          {headline}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {topUpset && (
          <Story label="Upset of the Week">
            {teamLine(
              topUpset.winnerName,
              resolveLogo(topUpset.winnerLogoUrl ?? null),
              `beat ${topUpset.loserName}${topUpset.matchResult ? ` ${topUpset.matchResult}` : ''} · ${Math.round(
                topUpset.winnerProbability * 100
              )}% shot`
            )}
          </Story>
        )}

        {topStreak && (
          <Story label="Hot Streak">
            {teamLine(
              topStreak.teamName,
              resolveLogo(topStreak.logoUrl ?? null),
              `${topStreak.streakCount} wins in a row · ${topStreak.division}`
            )}
          </Story>
        )}

        {mover && (
          <Story label={facts.teamOfTheWeek ? 'Team of the Week' : 'Biggest Riser'}>
            {teamLine(
              mover.teamName,
              resolveLogo(mover.logoUrl),
              `Power ${mover.previousScore.toFixed(1)} → ${mover.currentScore.toFixed(1)}`,
              recapColors.rise
            )}
          </Story>
        )}
      </div>
    </RecapGraphicFrame>
  );
};

export default RecapSummaryGraphic;
