import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Hash a client IP (or any identifier) with salted SHA-256 → hex.
 * We never store raw IPs; only the digest is sent to the database.
 * IP_HASH_SALT prevents simple IPv4 dictionary reversal of stored hashes.
 */
export async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get('IP_HASH_SALT');
  if (!salt) {
    throw new Error('IP_HASH_SALT is required');
  }
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getClientIp(req: Request): string {
  const trustedProxyHops = Number(Deno.env.get('SUPABASE_TRUSTED_PROXY_HOPS'));
  if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 1) {
    throw new Error('SUPABASE_TRUSTED_PROXY_HOPS is required');
  }

  const forwardedFor = req.headers.get('x-forwarded-for');
  const hops =
    forwardedFor
      ?.split(',')
      .map((hop) => hop.trim())
      .filter(Boolean) ?? [];

  if (hops.length < trustedProxyHops) {
    throw new Error('Trusted client IP header is unavailable');
  }

  // Configure SUPABASE_TRUSTED_PROXY_HOPS from observed Supabase Edge Runtime
  // behavior. Selecting from the right keeps client-prepended XFF values from
  // controlling the rate-limit key on append-style proxy chains.
  return hops[hops.length - trustedProxyHops];
}

export interface RateLimitOptions {
  endpoint: string;
  ipHash: string;
  windowSeconds: number;
  maxHits: number;
  failClosedOnError?: boolean;
}

/**
 * Calls the public.check_rate_limit RPC. Returns:
 *   - true  → request is allowed (and was recorded)
 *   - false → caller is over the limit; reject with 429
 * On RPC error, callers choose behavior with failClosedOnError. Public form
 * endpoints fail closed; non-critical analytics callers can keep failing open.
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
    return { allowed: opts.failClosedOnError === true ? false : true, error: error.message };
  }
  return { allowed: data === true, error: null };
}
