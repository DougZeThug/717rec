import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Hash a client IP (or any identifier) with SHA-256 → hex.
 * We never store raw IPs; only the digest is sent to the database.
 */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
 * On RPC error we fail-open (allow) so a DB hiccup never blocks the form,
 * but we surface the error so callers can log it.
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
    return { allowed: true, error: error.message };
  }
  return { allowed: data === true, error: null };
}
