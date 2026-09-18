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
