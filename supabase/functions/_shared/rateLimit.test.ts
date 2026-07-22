import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.190.0/assert/mod.ts';

import { checkRateLimit, getClientIp, hashIp } from './rateLimit.ts';

Deno.test('getClientIp uses client hop immediately before trusted proxy suffix', () => {
  const previous = Deno.env.get('SUPABASE_TRUSTED_PROXY_HOPS');
  Deno.env.set('SUPABASE_TRUSTED_PROXY_HOPS', '1');
  const req = new Request('http://localhost', {
    headers: {
      'x-forwarded-for': '203.0.113.66, 198.51.100.25',
      'x-real-ip': '192.0.2.10',
    },
  });

  try {
    assertEquals(getClientIp(req), '203.0.113.66');
  } finally {
    if (previous === undefined) Deno.env.delete('SUPABASE_TRUSTED_PROXY_HOPS');
    else Deno.env.set('SUPABASE_TRUSTED_PROXY_HOPS', previous);
  }
});

Deno.test('getClientIp fails closed instead of using spoofable fallback headers', () => {
  const previous = Deno.env.get('SUPABASE_TRUSTED_PROXY_HOPS');
  Deno.env.set('SUPABASE_TRUSTED_PROXY_HOPS', '1');
  const req = new Request('http://localhost', {
    headers: {
      'cf-connecting-ip': '203.0.113.77',
      'x-real-ip': '198.51.100.88',
      'user-agent': 'Test Agent',
    },
  });

  try {
    let threw = false;
    try {
      getClientIp(req);
    } catch (error) {
      threw = error instanceof Error && error.message === 'Trusted client IP header is unavailable';
    }
    assertEquals(threw, true);
  } finally {
    if (previous === undefined) Deno.env.delete('SUPABASE_TRUSTED_PROXY_HOPS');
    else Deno.env.set('SUPABASE_TRUSTED_PROXY_HOPS', previous);
  }
});

Deno.test('checkRateLimit fails open on RPC error by default', async () => {
  const client = {
    rpc: () => Promise.resolve({ data: null, error: { message: 'db unavailable' } }),
  };

  const result = await checkRateLimit(client as never, {
    endpoint: 'test-endpoint',
    ipHash: 'hash',
    windowSeconds: 60,
    maxHits: 1,
  });

  assertEquals(result, { allowed: true, error: 'db unavailable' });
});

Deno.test('checkRateLimit fails closed on RPC error when requested', async () => {
  const client = {
    rpc: () => Promise.resolve({ data: null, error: { message: 'db unavailable' } }),
  };

  const result = await checkRateLimit(client as never, {
    endpoint: 'test-endpoint',
    ipHash: 'hash',
    windowSeconds: 60,
    maxHits: 1,
    failClosedOnError: true,
  });

  assertEquals(result, { allowed: false, error: 'db unavailable' });
});

Deno.test('hashIp uses IP_HASH_SALT when present', async () => {
  const previous = Deno.env.get('IP_HASH_SALT');
  try {
    Deno.env.set('IP_HASH_SALT', 'salt-one');
    const first = await hashIp('198.51.100.25');
    Deno.env.set('IP_HASH_SALT', 'salt-two');
    const second = await hashIp('198.51.100.25');

    assertNotEquals(first, second);
  } finally {
    if (previous === undefined) Deno.env.delete('IP_HASH_SALT');
    else Deno.env.set('IP_HASH_SALT', previous);
  }
});

Deno.test('hashIp requires IP_HASH_SALT', async () => {
  const previous = Deno.env.get('IP_HASH_SALT');
  Deno.env.delete('IP_HASH_SALT');
  try {
    let threw = false;
    try {
      await hashIp('198.51.100.25');
    } catch (error) {
      threw = error instanceof Error && error.message === 'IP_HASH_SALT is required';
    }
    assertEquals(threw, true);
  } finally {
    if (previous === undefined) Deno.env.delete('IP_HASH_SALT');
    else Deno.env.set('IP_HASH_SALT', previous);
  }
import { assertEquals, assertMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { hashIp } from './rateLimit.ts';

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
