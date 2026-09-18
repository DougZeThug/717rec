import React from 'react';

import type { RecapTeamGrade } from '@/types/recapEdition';
import { getGradeChartColor } from '@/utils/reportCardUtils';

import GraphicTeamMark from './GraphicTeamMark';
import type { RankingPage } from './powerRankingPages';
import { RANKING_ROW } from './powerRankingPages';
import RecapGraphicFrame from './RecapGraphicFrame';
import { recapColors, recapFonts } from './recapGraphicTokens';

/** Hoisted so the default is one object, not a new one every render. */
const NO_BLURBS: Record<string, string> = {};

interface PowerRankingsGraphicProps {
  page: RankingPage;
  seasonName: string;
  weekNumber: number;
  /** teamId -> the line written about that team. Missing means no blurb line. */
  blurbs?: Record<string, string>;
  /** Swapped for a data URL during export; identity on screen. */
  resolveLogo?: (url: string | null) => string | null;
}

/** Places gained or lost since last week, or a dash when there is nothing to compare. */
const formatMovement = (team: RecapTeamGrade): { text: string; color: string } => {
  if (team.previousRank === null) return { text: '—', color: recapColors.muted };

  const moved = team.previousRank - team.rank;
  if (moved > 0) return { text: `▲${moved}`, color: recapColors.rise };
  if (moved < 0) return { text: `▼${Math.abs(moved)}`, color: recapColors.fall };
  return { text: '▬', color: recapColors.muted };
};

/**
 * One page of the league-wide power rankings.
 *
 * Rows arrive already ranked and graded by gradeTeamsForWeek, so this component
 * never re-sorts and never re-grades. Its only job is to draw them.
 *
 * The blurb is clamped to a single line here because the row height is fixed —
 * nine rows have to fit the frame exactly. The full text always appears on the
 * edition's web page, which has no such limit.
 */
const PowerRankingsGraphic: React.FC<PowerRankingsGraphicProps> = ({
  page,
  seasonName,
  weekNumber,
  blurbs = NO_BLURBS,
  resolveLogo = (url) => url,
}) => (
  <RecapGraphicFrame
    seasonName={seasonName}
    kicker={
      page.pageCount > 1
        ? `Power Rankings ${page.label} · ${page.page} of ${page.pageCount}`
        : 'Power Rankings'
    }
    weekLabel={`Week ${weekNumber}`}
  >
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {page.teams.map((team) => {
        const movement = formatMovement(team);
        const blurb = blurbs[team.teamId]?.trim() ?? '';

        return (
          <div
            key={team.teamId}
            style={{
              padding: `${RANKING_ROW.padding}px 0`,
              borderBottom: `${RANKING_ROW.borderWidth}px solid ${recapColors.hairline}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                height: RANKING_ROW.lineHeight,
              }}
            >
              <span
                style={{
                  width: 56,
                  fontFamily: recapFonts.display,
                  fontSize: 38,
                  color: team.rank <= 3 ? recapColors.wood : recapColors.cream,
                }}
              >
                {team.rank}
              </span>

              <span
                style={{
                  width: 62,
                  fontFamily: recapFonts.numeric,
                  fontSize: 22,
                  color: movement.color,
                }}
              >
                {movement.text}
              </span>

              <GraphicTeamMark
                teamName={team.teamName}
                logoSrc={resolveLogo(team.logoUrl)}
                size={44}
              />

              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: recapFonts.heading,
                  fontSize: 30,
                  // A long name must not push the grade and numbers off the image.
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {team.teamName}
              </span>

              <span
                style={{
                  width: 62,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  fontFamily: recapFonts.display,
                  fontSize: 28,
                  color: recapColors.navyDeep,
                  // An unrated team gets a muted dash, never a letter it has
                  // not earned.
                  backgroundColor: team.grade
                    ? getGradeChartColor(team.grade)
                    : recapColors.hairline,
                }}
              >
                {team.grade ?? '—'}
              </span>

              <span
                style={{
                  width: 86,
                  textAlign: 'right',
                  fontFamily: recapFonts.numeric,
                  fontSize: 24,
                }}
              >
                {team.wins}–{team.losses}
              </span>

              <span
                style={{
                  width: 96,
                  textAlign: 'right',
                  fontFamily: recapFonts.numeric,
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {team.powerScore === null ? '—' : team.powerScore.toFixed(1)}
              </span>
            </div>

            <div
              style={{
                height: RANKING_ROW.blurbHeight,
                marginLeft: 134,
                marginTop: RANKING_ROW.blurbGap,
                fontSize: 19,
                lineHeight: `${RANKING_ROW.blurbHeight}px`,
                color: recapColors.muted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {blurb}
            </div>
          </div>
        );
      })}
    </div>
  </RecapGraphicFrame>
);

export default PowerRankingsGraphic;
