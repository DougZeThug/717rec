import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Hash a client IP (or any identifier) with SHA-256 → hex.
 *
 * We never store raw IPs; only the digest is sent to the database. The digest
 * is salted with the IP_HASH_SALT secret so it is NOT trivially reversible:
 * a plain SHA-256 of an IPv4 address can be brute-forced in seconds (there are
 * only ~4 billion IPv4 values), but without the secret salt an attacker can't
 * pre-compute the table. Set IP_HASH_SALT in the function's runtime secrets in
 * production; if it is unset the hash falls back to unsalted (still fine for
 * rate-limit bucketing, but not for privacy).
 */
export async function hashIp(
  ip: string,
  salt: string = Deno.env.get('IP_HASH_SALT') ?? ''
): Promise<string> {
  const data = new TextEncoder().encode(`${salt}|${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parse a client IP out of an X-Forwarded-For header value.
 *
 * SECURITY: X-Forwarded-For is a comma-separated, append-only list
 *   "clientClaim, proxy1, proxy2, ..."
 * The LEFTMOST entry is fully client-controlled — a bot can send
 *   `X-Forwarded-For: 1.2.3.4`
 * and the real client IP is then appended AFTER it. So keying on the first hop
 * (the old behaviour) let anyone rotate a spoofed value to dodge the limiter.
 *
 * Only the last N entries are meaningful, where N = the number of proxies we
 * trust in front of this function (each trusted proxy appends exactly one
 * entry). We therefore take the value N hops from the RIGHT: index (length - N).
 *
 *   N = 1  → rightmost entry  (the IP the platform's edge observed)
 *   N = 2  → second from right (one extra trusted proxy in front)
 *
 * If the chain is shorter than N (request did not traverse the expected number
 * of trusted proxies) we fall back to the oldest entry rather than a spoofable
 * tail; that is a degraded but bounded case.
 */
export function parseForwardedFor(xff: string, trustedProxyCount: number): string | null {
  const parts = xff
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;

  const n = Math.max(1, Math.floor(trustedProxyCount));
  const idx = parts.length - n;
  return parts[idx >= 0 ? idx : 0];
}

/**
 * Determine a platform-trusted client IP for rate-limiting.
 *
 * ┌─ EMPIRICAL VERIFICATION REQUIRED (PR-07) ─────────────────────────────┐
 * │ The authoritative header and proxy count for Supabase's edge runtime  │
 * │ must be confirmed on the live project, NOT assumed. To verify:        │
 * │   1. Set RATE_LIMIT_DEBUG_HEADERS=1 in the function's secrets.         │
 * │   2. Submit the form from two different networks (e.g. home + phone    │
 * │      hotspot).                                                         │
 * │   3. Read the logged `request headers` lines and note which header     │
 * │      carries each network's real public IP, and at what position in    │
 * │      X-Forwarded-For.                                                  │
 * │   4. Set TRUSTED_PROXY_COUNT to that hop count, then turn the debug    │
 * │      flag back off.                                                    │
 * │                                                                        │
 * │ Starting point: Supabase Edge Functions run behind a single edge      │
 * │ proxy that appends the observed client IP as the LAST X-Forwarded-For  │
 * │ hop, so the default N = 1 (rightmost) is the documented default until  │
 * │ the check above says otherwise.                                        │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export function getTrustedClientIp(req: Request): string {
  const trustedProxyCount = Number(Deno.env.get('TRUSTED_PROXY_COUNT') ?? '1') || 1;

  if (Deno.env.get('RATE_LIMIT_DEBUG_HEADERS') === '1') {
    // Temporary, opt-in header dump for the empirical verification step above.
    console.log('[rateLimit] request headers:', JSON.stringify(Object.fromEntries(req.headers)));
  }

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const ip = parseForwardedFor(xff, trustedProxyCount);
    if (ip) return ip;
  }

  // Fallbacks are only safe if the platform overwrites any inbound value of
  // these headers (verify before relying on them). x-real-ip is commonly set
  // by the edge; cf-connecting-ip only appears when fronted by Cloudflare.
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

export interface RateLimitOptions {
  endpoint: string;
  ipHash: string;
  windowSeconds: number;
  maxHits: number;
}

/**
 * Calls the public.check_rate_limit RPC. Returns:
 *   - allowed: true  → request is allowed (and was recorded)
 *   - allowed: false → caller is over the limit OR the RPC errored; reject 429
 *
 * FAIL CLOSED: on RPC error we now DENY (allowed: false). These endpoints are
 * unauthenticated public form handlers — a rare false-positive 429 during a DB
 * hiccup is far better than failing open and leaving the spam channel wide
 * open. Callers still get `error` so they can log the underlying cause.
 */
export async function checkRateLimit(
  client: SupabaseClient,
  opts: RateLimitOptions
): Promise<{ allowed: boolean; error: string | null }> {
  const { data, error } = await client.rpc('check_rate_limit', {
    _endpoint: opts.endpoint,
    _ip_hash: opts.ipHash,
    _window_seconds: opts.windowSeconds,
    _max_hits: opts.maxHits,
  });

  if (error) {
    return { allowed: false, error: error.message };
  }
  return { allowed: data === true, error: null };
}
