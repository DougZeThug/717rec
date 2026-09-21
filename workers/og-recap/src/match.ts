/**
 * The pure matching helpers, kept apart from the worker entry point.
 *
 * index.ts uses Cloudflare Workers globals (HTMLRewriter), which the app's
 * TypeScript project does not know about. Splitting these out means the test
 * suite can import and check them without pulling those globals in.
 */

/**
 * Bots that render link previews. Deliberately a list rather than "not a
 * browser": anything unrecognised is treated as a human and served the
 * untouched page.
 */
export const CRAWLER_PATTERN =
  /facebookexternalhit|facebookcatalog|twitterbot|slackbot|linkedinbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|skypeuripreview|bingbot|googlebot|embedly|iframely|nuzzel|vkshare|bufferbot|mastodon|blueskybot/i;

export const RECAP_PATH = /^\/recap\/([a-z0-9-]{1,80})\/week-(\d{1,2})\/?$/;

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One published recap edition, as the crawler needs to see it. */
export interface EditionPreview {
  seasonName: string;
  weekNumber: number;
  headline: string;
  caption: string;
  graphicUrl: string | null;
}

/**
 * The league logo, absolute. A hand copy of `BASE_URL + DEFAULT_IMAGE` from
 * src/components/seo/seoDefaults.ts — this worker deploys on its own and cannot
 * import from the app. tests/ogRecapWorker.test.ts asserts the two still agree.
 */
export const DEFAULT_PREVIEW_IMAGE =
  'https://717rec.app/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png';

/** The shell's own wording for the logo, so a fallback reads the same. */
const DEFAULT_IMAGE_ALT = '717REC cornhole league logo';

/**
 * The head tags that replace the shell's own.
 *
 * The worker strips every og:* and twitter:* tag before this runs, so whatever
 * is not returned here is simply gone. An edition is allowed to have no graphic
 * — publishing captures one best-effort and carries on without it — and those
 * pages used to end up with no image and no card at all, which is worse than
 * leaving the shell alone. They fall back to the league logo and the small
 * card, matching what SeoHead renders for a reader at the same URL.
 */
export function buildHeadTags(preview: EditionPreview, pageUrl: string): string[] {
  const title = `717REC — ${preview.seasonName} Week ${preview.weekNumber} Recap`;
  const description =
    preview.headline || preview.caption.slice(0, 200) || `Week ${preview.weekNumber} results.`;
  const hasGraphic = Boolean(preview.graphicUrl);
  const image = preview.graphicUrl || DEFAULT_PREVIEW_IMAGE;

  return [
    '<meta property="og:site_name" content="717REC">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
    '<meta property="og:type" content="article">',
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    // Structured properties attach to the og:image above them, so they stay
    // next to it — and only for a real graphic: 1080x1350 describes the recap
    // artwork, not the logo.
    ...(hasGraphic
      ? [
          '<meta property="og:image:width" content="1080">',
          '<meta property="og:image:height" content="1350">',
        ]
      : []),
    `<meta property="og:image:alt" content="${escapeHtml(hasGraphic ? title : DEFAULT_IMAGE_ALT)}">`,
    // The rule SeoHead applies: the default logo does not earn a big card.
    `<meta name="twitter:card" content="${hasGraphic ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
  ];
}
