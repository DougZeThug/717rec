import { assertEquals, assertMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { checkRateLimit, hashIp, parseForwardedFor } from './rateLimit.ts';

Deno.test('hashIp returns a 64-char lowercase hex SHA-256 digest', async () => {
  const digest = await hashIp('1.2.3.4');
  assertEquals(digest.length, 64);
  assertMatch(digest, /^[0-9a-f]{64}$/);
});

Deno.test('hashIp is deterministic for the same input', async () => {
  const a = await hashIp('10.0.0.1');
  const b = await hashIp('10.0.0.1');
  assertEquals(a, b);
});

Deno.test('hashIp differs across inputs', async () => {
  const a = await hashIp('1.2.3.4');
  const b = await hashIp('5.6.7.8');
  if (a === b) throw new Error('hashIp must differ across distinct IPs');
});

Deno.test('hashIp differs when salted vs unsalted for the same IP', async () => {
  const unsalted = await hashIp('1.2.3.4', '');
  const salted = await hashIp('1.2.3.4', 'super-secret-salt');
  if (unsalted === salted) throw new Error('salt must change the digest');
});

// --- parseForwardedFor: never trust the client-controlled first hop ---

Deno.test('parseForwardedFor returns the last hop when one proxy is trusted', () => {
  // A bot prepended a fake IP; the platform appended the real one last.
  assertEquals(parseForwardedFor('1.2.3.4, 203.0.113.9', 1), '203.0.113.9');
});

Deno.test('parseForwardedFor ignores a spoofed prepended value', () => {
  assertEquals(parseForwardedFor('evil-spoof, 9.9.9.9, 203.0.113.9', 1), '203.0.113.9');
});

Deno.test('parseForwardedFor takes N-from-right when 2 proxies are trusted', () => {
  // Chain: client, edge1, edge2 → with 2 trusted proxies the client is 2nd from right.
  assertEquals(parseForwardedFor('203.0.113.9, 10.0.0.1, 10.0.0.2', 2), '10.0.0.1');
});

Deno.test('parseForwardedFor falls back to the oldest entry if chain is shorter than N', () => {
  assertEquals(parseForwardedFor('203.0.113.9', 2), '203.0.113.9');
});

Deno.test('parseForwardedFor returns null for an empty header', () => {
  assertEquals(parseForwardedFor('   ', 1), null);
});

// --- checkRateLimit: fail CLOSED on RPC error ---

Deno.test('checkRateLimit denies (fails closed) when the RPC errors', async () => {
  const fakeClient = {
    rpc: () => Promise.resolve({ data: null, error: { message: 'db down' } }),
  } as unknown as Parameters<typeof checkRateLimit>[0];
  const res = await checkRateLimit(fakeClient, {
    endpoint: 'x',
    ipHash: 'y',
    windowSeconds: 60,
    maxHits: 5,
  });
  assertEquals(res.allowed, false);
  assertEquals(res.error, 'db down');
});

Deno.test('checkRateLimit allows when the RPC returns true', async () => {
  const fakeClient = {
    rpc: () => Promise.resolve({ data: true, error: null }),
  } as unknown as Parameters<typeof checkRateLimit>[0];
  const res = await checkRateLimit(fakeClient, {
    endpoint: 'x',
    ipHash: 'y',
    windowSeconds: 60,
    maxHits: 5,
  });
  assertEquals(res.allowed, true);
  assertEquals(res.error, null);
});
