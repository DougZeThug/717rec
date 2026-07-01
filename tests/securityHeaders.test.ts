import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Smoke test for the SPA's HTTP security response headers.
 *
 * The headers live in `public/_headers`, which Vite copies verbatim into
 * `dist/_headers` at build time. The host (Cloudflare Workers static assets —
 * see wrangler.toml — Cloudflare Pages, Netlify, or the Lovable publish
 * pipeline) then applies them to every response.
 *
 * Cloudflare only applies `_headers` on the deployed site, so the real response
 * headers cannot be observed from the Vite dev/preview server in CI. Instead we
 * validate the source file that ships to production — it is exactly what
 * determines the served headers, and it is what regresses if someone edits it.
 */

const HEADERS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  '_headers'
);

const RAW = readFileSync(HEADERS_PATH, 'utf8');

/**
 * Parse the `_headers` file into a lower-cased header-name -> value map for the
 * global `/*` rule. In `_headers`, an unindented line is a path pattern and the
 * indented `Name: value` lines beneath it are its headers. `#` comments and
 * blank lines are ignored.
 */
function parseGlobalRule(contents: string): Map<string, string> {
  const headers = new Map<string, string>();
  let inGlobalRule = false;

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Unindented line => a new path pattern. Only capture headers under `/*`.
    if (!/^\s/.test(line)) {
      inGlobalRule = trimmed === '/*';
      continue;
    }

    if (!inGlobalRule) continue;

    // Split on the first colon only, so values containing `:` (https://, wss://)
    // are preserved intact.
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    headers.set(line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim());
  }

  return headers;
}

describe('SPA security headers (public/_headers)', () => {
  const headers = parseGlobalRule(RAW);

  it('applies its headers to every route via a global /* rule', () => {
    expect(RAW).toMatch(/^\/\*\s*$/m);
    expect(headers.size).toBeGreaterThan(0);
  });

  it.each([
    ['x-frame-options', 'DENY'],
    ['x-content-type-options', 'nosniff'],
    ['referrer-policy', 'strict-origin-when-cross-origin'],
    ['cross-origin-opener-policy', 'same-origin'],
  ])('sets %s: %s', (name, value) => {
    expect(headers.get(name)).toBe(value);
  });

  it('enforces HSTS for at least a year including subdomains', () => {
    const hsts = headers.get('strict-transport-security') ?? '';
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? '0');
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(hsts).toMatch(/includeSubDomains/i);
  });

  it('disables powerful browser features via Permissions-Policy', () => {
    const pp = headers.get('permissions-policy') ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(pp).toMatch(new RegExp(`(^|[ ,])${feature}=\\(\\)`));
    }
  });

  describe('Content-Security-Policy', () => {
    const csp = headers.get('content-security-policy-report-only') ?? '';

    it('ships in Report-Only mode first so it cannot break the live site', () => {
      expect(csp.length).toBeGreaterThan(0);
      // The enforcing header must not be set yet — report-only is the first step.
      expect(headers.has('content-security-policy')).toBe(false);
    });

    it('sets the safe baseline directives', () => {
      expect(csp).toMatch(/(^|;)\s*default-src 'self'/);
      expect(csp).toMatch(/(^|;)\s*base-uri 'self'/);
      expect(csp).toMatch(/(^|;)\s*object-src 'none'/);
      expect(csp).toMatch(/(^|;)\s*frame-ancestors 'none'/);
    });

    it('allow-lists the Supabase backend for XHR and realtime', () => {
      const connectSrc = /connect-src ([^;]+)/.exec(csp)?.[1] ?? '';
      expect(connectSrc).toContain("'self'");
      expect(connectSrc).toContain('https://wcitdamvochthvxvtxyb.supabase.co');
      expect(connectSrc).toContain('wss://wcitdamvochthvxvtxyb.supabase.co');
    });
  });
});
