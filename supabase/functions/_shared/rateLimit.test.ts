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
