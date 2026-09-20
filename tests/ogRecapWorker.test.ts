import { describe, expect, it } from 'vitest';

import { BASE_URL, DEFAULT_IMAGE } from '@/components/seo/seoDefaults';

import {
  buildHeadTags,
  CRAWLER_PATTERN,
  DEFAULT_PREVIEW_IMAGE,
  type EditionPreview,
  escapeHtml,
  RECAP_PATH,
} from '../workers/og-recap/src/match';

describe('RECAP_PATH', () => {
  it('matches a published recap address', () => {
    const match = RECAP_PATH.exec('/recap/fall-2026/week-6');
    expect(match?.[1]).toBe('fall-2026');
    expect(match?.[2]).toBe('6');
  });

  it('tolerates a trailing slash', () => {
    expect(RECAP_PATH.exec('/recap/fall-2026/week-6/')).not.toBeNull();
  });

  // Anything the pattern misses is simply proxied through, so a miss is safe —
  // but a false MATCH would send a pointless query on every request.
  it.each([
    '/recap',
    '/recap/fall-2026',
    '/recap/fall-2026/week-',
    '/recap/fall-2026/week-abc',
    '/recap/fall-2026/week-123',
    '/recap/Fall_2026/week-6',
    '/recaps/fall-2026/week-6',
    '/',
  ])('does not match %s', (path) => {
    expect(RECAP_PATH.exec(path)).toBeNull();
  });
});

describe('CRAWLER_PATTERN', () => {
  it.each([
    'facebookexternalhit/1.1',
    'Twitterbot/1.0',
    'Slackbot-LinkExpanding 1.0',
    'LinkedInBot/1.0',
    'Mozilla/5.0 (compatible; Discordbot/2.0)',
    'WhatsApp/2.19',
    'Mozilla/5.0 (compatible; bingbot/2.0)',
  ])('recognises %s as a preview crawler', (ua) => {
    expect(CRAWLER_PATTERN.test(ua)).toBe(true);
  });

  // A human must always get the untouched page. Anything unrecognised is
  // treated as a human on purpose.
  it.each([
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
    '',
  ])('treats %s as a human', (ua) => {
    expect(CRAWLER_PATTERN.test(ua)).toBe(false);
  });
});

describe('escapeHtml', () => {
  it('neutralises a caption that contains markup', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('escapes a quote that would otherwise close the content attribute', () => {
    expect(escapeHtml('Bag Chasers "won"')).toBe('Bag Chasers &quot;won&quot;');
  });

  it('escapes ampersands before anything else, so nothing double-escapes', () => {
    expect(escapeHtml('Bags & Beers')).toBe('Bags &amp; Beers');
  });
});

describe('buildHeadTags', () => {
  const PAGE_URL = 'https://717rec.app/recap/fall-2026/week-6';
  const GRAPHIC = 'https://cdn.example/week-6.png';

  const preview = (over: Partial<EditionPreview> = {}): EditionPreview => ({
    seasonName: 'Fall 2026',
    weekNumber: 6,
    headline: 'Bag Chasers roll',
    caption: 'A caption',
    graphicUrl: GRAPHIC,
    ...over,
  });

  const contentOf = (tags: string[], attr: string, name: string): string | undefined =>
    tags.find((tag) => tag.includes(`${attr}="${name}"`))?.match(/content="([^"]*)"/)?.[1];

  it('points the preview at the edition graphic and asks for the big card', () => {
    const tags = buildHeadTags(preview(), PAGE_URL);

    expect(contentOf(tags, 'property', 'og:image')).toBe(GRAPHIC);
    expect(contentOf(tags, 'name', 'twitter:image')).toBe(GRAPHIC);
    expect(contentOf(tags, 'name', 'twitter:card')).toBe('summary_large_image');
    expect(contentOf(tags, 'property', 'og:image:width')).toBe('1080');
    expect(contentOf(tags, 'property', 'og:image:height')).toBe('1350');
  });

  // The bug: the worker strips every og:*/twitter:* tag from the shell, and used
  // to re-add the image ones only when the edition had a graphic. Publishing
  // captures a graphic best-effort and carries on without it, so those editions
  // reached crawlers with no image and no card at all — worse than an untouched
  // page, and at odds with what a reader gets at the same URL.
  it('falls back to the league logo when the edition has no graphic', () => {
    const tags = buildHeadTags(preview({ graphicUrl: null }), PAGE_URL);

    expect(contentOf(tags, 'property', 'og:image')).toBe(DEFAULT_PREVIEW_IMAGE);
    expect(contentOf(tags, 'name', 'twitter:image')).toBe(DEFAULT_PREVIEW_IMAGE);
    // The logo does not earn a big card, exactly as SeoHead decides it.
    expect(contentOf(tags, 'name', 'twitter:card')).toBe('summary');
    // 1080x1350 describes the recap artwork, not the logo.
    expect(tags.some((tag) => tag.includes('og:image:width'))).toBe(false);
    expect(tags.some((tag) => tag.includes('og:image:height'))).toBe(false);
  });

  it('emits exactly one image and one card, graphic or not', () => {
    for (const graphicUrl of [GRAPHIC, null]) {
      const tags = buildHeadTags(preview({ graphicUrl }), PAGE_URL);

      expect(tags.filter((tag) => tag.includes('property="og:image"'))).toHaveLength(1);
      expect(tags.filter((tag) => tag.includes('name="twitter:image"'))).toHaveLength(1);
      expect(tags.filter((tag) => tag.includes('name="twitter:card"'))).toHaveLength(1);
    }
  });

  it('puts back the site name and the image alt the strip removed', () => {
    const withGraphic = buildHeadTags(preview(), PAGE_URL);
    const without = buildHeadTags(preview({ graphicUrl: null }), PAGE_URL);

    expect(contentOf(withGraphic, 'property', 'og:site_name')).toBe('717REC');
    expect(contentOf(without, 'property', 'og:site_name')).toBe('717REC');
    expect(contentOf(withGraphic, 'property', 'og:image:alt')).toBe(
      '717REC — Fall 2026 Week 6 Recap'
    );
    // The shell's own wording, so the fallback reads the same as an untouched page.
    expect(contentOf(without, 'property', 'og:image:alt')).toBe('717REC cornhole league logo');
  });

  it('escapes a headline that carries markup', () => {
    const tags = buildHeadTags(preview({ headline: 'Bag Chasers "won" & <b>ran</b>' }), PAGE_URL);

    expect(contentOf(tags, 'property', 'og:description')).toBe(
      'Bag Chasers &quot;won&quot; &amp; &lt;b&gt;ran&lt;/b&gt;'
    );
    expect(tags.join('')).not.toContain('<b>ran</b>');
  });

  it('describes the week when there is neither headline nor caption', () => {
    const tags = buildHeadTags(preview({ headline: '', caption: '' }), PAGE_URL);

    expect(contentOf(tags, 'property', 'og:description')).toBe('Week 6 results.');
  });

  it('trims a long caption to 200 characters', () => {
    const tags = buildHeadTags(preview({ headline: '', caption: 'x'.repeat(300) }), PAGE_URL);

    expect(contentOf(tags, 'property', 'og:description')).toHaveLength(200);
  });

  // The worker cannot import from src/, so it keeps its own copy. This is what
  // stops the two drifting apart.
  it("keeps the worker's default image in step with the app's", () => {
    expect(DEFAULT_PREVIEW_IMAGE).toBe(`${BASE_URL}${DEFAULT_IMAGE}`);
  });
});
