import { describe, expect, it } from 'vitest';

import { CRAWLER_PATTERN, escapeHtml, RECAP_PATH } from '../workers/og-recap/src/match';

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
