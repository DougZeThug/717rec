import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { countUrls, MAX_URLS_PER_MESSAGE } from './spam.ts';

// The regression this file exists for. A scheme-prefixed link whose host also
// starts with "www." used to score two, so three of them tripped a limit
// documented as five and the sender was refused as a spammer.
Deno.test('countUrls counts a scheme-plus-www link once, not twice', () => {
  assertEquals(countUrls('https://www.example.com/watch?v=abc'), 1);
  assertEquals(countUrls('http://www.example.com'), 1);
});

Deno.test('countUrls lets three ordinary links through the spam limit', () => {
  const message = [
    'Here is the evidence:',
    'https://www.youtube.com/watch?v=abc',
    'https://www.facebook.com/events/99',
    'https://www.google.com/maps/place/Some+Field',
  ].join('\n');

  assertEquals(countUrls(message), 3);
  assertEquals(countUrls(message) > MAX_URLS_PER_MESSAGE, false);
});

Deno.test('countUrls still counts links that carry no scheme', () => {
  // Dropping these would be the opposite mistake: six bare links would score
  // zero and sail past the limit.
  assertEquals(countUrls('www.a.com www.b.com www.c.com'), 3);

  const six = Array.from({ length: 6 }, (_, i) => `www.spam${i}.com`).join(' ');
  assertEquals(countUrls(six), 6);
  assertEquals(countUrls(six) > MAX_URLS_PER_MESSAGE, true);
});

Deno.test('countUrls still blocks a genuine link flood', () => {
  const six = Array.from({ length: 6 }, (_, i) => `https://www.spam${i}.com`).join(' ');
  assertEquals(countUrls(six), 6);
  assertEquals(countUrls(six) > MAX_URLS_PER_MESSAGE, true);
});

Deno.test('countUrls counts nothing in a message with no links', () => {
  assertEquals(countUrls('My score was wrong on match 12. Can someone check it?'), 0);
  assertEquals(countUrls(''), 0);
});
