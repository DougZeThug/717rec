import type { RecapTeamGrade } from '@/types/recapEdition';

/**
 * The geometry of one ranking row, in the pixels the graphic is exported at.
 *
 * Defined here rather than inline in the component so a test can check the
 * rows still fit the frame. jsdom does no layout, so nothing else would catch
 * a tenth row silently pushing the last team off the bottom of the PNG — and
 * the PNG is what gets posted.
 */
export const RANKING_ROW = {
  /** Vertical padding, top and bottom. */
  padding: 8,
  /** The line carrying rank, logo, name, grade and numbers. */
  lineHeight: 44,
  /** The blurb line underneath, plus the gap above it. */
  blurbHeight: 26,
  blurbGap: 2,
  borderWidth: 1,
} as const;

export const RANKING_ROW_HEIGHT =
  RANKING_ROW.padding * 2 +
  RANKING_ROW.lineHeight +
  RANKING_ROW.blurbGap +
  RANKING_ROW.blurbHeight +
  RANKING_ROW.borderWidth;

/**
 * Content height the frame leaves for rows: 1350 tall, less the 72px gutters,
 * the ~254px header, the ~68px footer and the 40px gap above the block.
 */
export const RANKING_CONTENT_BUDGET = 844;

/**
 * The most rows that stay readable on one 1080x1350 graphic.
 *
 * Nine is what the budget above allows once each row carries a logo, a grade
 * and a line of blurb. `powerRankingPages.test.ts` holds the two to each other.
 */
export const RANKING_ROWS_PER_PAGE = 9;

export interface RankingPage {
  /** 1-based page number. */
  page: number;
  pageCount: number;
  /** e.g. "1–9". */
  label: string;
  teams: RecapTeamGrade[];
}

/**
 * Split the league into pages of even size.
 *
 * Even, rather than filling each page to the cap: 26 teams chunked at nine
 * would be 9 / 9 / 8, which is fine, but 28 would be 9 / 9 / 9 / 1 and that
 * last image is not worth posting. Working out the page COUNT first and then
 * spreading teams across it gives 7 / 7 / 7 / 7 instead.
 */
export const paginateRankings = (
  teams: RecapTeamGrade[],
  rowsPerPage: number = RANKING_ROWS_PER_PAGE
): RankingPage[] => {
  if (teams.length === 0) return [];

  const pageCount = Math.ceil(teams.length / rowsPerPage);
  const base = Math.floor(teams.length / pageCount);
  // The first `remainder` pages take one extra, so sizes differ by at most one.
  const remainder = teams.length % pageCount;

  const pages: RankingPage[] = [];
  let cursor = 0;

  for (let page = 1; page <= pageCount; page += 1) {
    const size = base + (page <= remainder ? 1 : 0);
    const slice = teams.slice(cursor, cursor + size);
    cursor += size;

    pages.push({
      page,
      pageCount,
      // Ranks, not indexes: what the reader sees on the image.
      label: slice.length > 0 ? `${slice[0].rank}–${slice[slice.length - 1].rank}` : '',
      teams: slice,
    });
  }

  return pages;
};
