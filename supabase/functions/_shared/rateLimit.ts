import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Hash a client IP (or any identifier) with salted SHA-256 → hex.
 * We never store raw IPs; only the digest is sent to the database.
 * IP_HASH_SALT prevents simple IPv4 dictionary reversal of stored hashes.
 */
export async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get('IP_HASH_SALT') ?? '';
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const hops = forwardedFor
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      // Supabase Edge Functions are reached behind the platform proxy, which appends
      // its observed client address as the right-most X-Forwarded-For hop. Local
      // E2E header captures on the Supabase runtime showed client-supplied spoofed
      // left hops were preserved while the platform-added hop appeared last, so use
      // one trusted proxy hop from the right rather than the client-controllable first hop.
      return hops[hops.length - 1];
    }
  }

  // Supabase may expose CF-Connecting-IP in some deployments. x-real-ip is only
  // a fallback for local/dev requests where no platform XFF chain exists.
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}

export interface RateLimitOptions {
  endpoint: string;
  ipHash: string;
  windowSeconds: number;
  maxHits: number;
}

/**
 * Calls the public.check_rate_limit RPC. Returns:
 *   - true  → request is allowed (and was recorded)
 *   - false → caller is over the limit; reject with 429
 * On RPC error we fail closed for public form endpoints. A brief false positive
 * is safer than disabling spam throttling for unauthenticated traffic.
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
