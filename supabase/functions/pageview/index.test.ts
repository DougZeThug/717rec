import 'https://deno.land/std@0.224.0/dotenv/load.ts';

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { computeAnonDayId } from './index.ts';

Deno.test('computeAnonDayId is deterministic for same inputs', async () => {
  const a = await computeAnonDayId('1.2.3.4', 'ua', 'salt', '2026-07-17');
  const b = await computeAnonDayId('1.2.3.4', 'ua', 'salt', '2026-07-17');
  assertEquals(a, b);
  assertEquals(a.length, 16);
});

Deno.test('computeAnonDayId rotates when day changes', async () => {
  const a = await computeAnonDayId('1.2.3.4', 'ua', 'salt', '2026-07-17');
  const b = await computeAnonDayId('1.2.3.4', 'ua', 'salt', '2026-07-18');
  if (a === b) throw new Error('anon_day_id must differ across days');
});

Deno.test('computeAnonDayId differs across IPs', async () => {
  const a = await computeAnonDayId('1.2.3.4', 'ua', 'salt', '2026-07-17');
  const b = await computeAnonDayId('5.6.7.8', 'ua', 'salt', '2026-07-17');
  if (a === b) throw new Error('anon_day_id must differ across IPs');
});
