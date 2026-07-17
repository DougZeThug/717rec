import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { checkRateLimit, getClientIp, hashIp } from './rateLimit.ts';

Deno.test('getClientIp uses Supabase-populated first XFF hop', () => {
  const req = new Request('http://localhost', {
    headers: {
      'x-forwarded-for': '203.0.113.66, 198.51.100.25',
      'x-real-ip': '192.0.2.10',
    },
  });

  assertEquals(getClientIp(req), '203.0.113.66');
});

Deno.test('getClientIp ignores untrusted fallback IP headers when XFF is missing', () => {
  const req = new Request('http://localhost', {
    headers: {
      'cf-connecting-ip': '203.0.113.77',
      'x-real-ip': '198.51.100.88',
      'user-agent': 'Test Agent',
    },
  });

  assertEquals(getClientIp(req), 'unknown:Test Agent');
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
});
