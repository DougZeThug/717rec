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

// Links run together with punctuation and no spaces. Counting whole links with
// a greedy tail read all of these as one, which would have let a sender put any
// number of them past the limit; counting where each link starts cannot.
Deno.test('countUrls counts links that are joined by punctuation', () => {
  assertEquals(countUrls('https://a.test,https://b.test'), 2);
  assertEquals(countUrls('www.a.com,www.b.com'), 2);
  assertEquals(countUrls('https://www.a.com,https://www.b.com'), 2);
});

Deno.test('countUrls blocks a flood that leaves out the spaces', () => {
  const forms = [
    (i: number) => `https://spam${i}.test`,
    (i: number) => `www.spam${i}.test`,
    (i: number) => `https://www.spam${i}.test`,
  ];

  for (const form of forms) {
    const six = Array.from({ length: 6 }, (_, i) => form(i)).join(',');
    assertEquals(countUrls(six), 6);
    assertEquals(countUrls(six) > MAX_URLS_PER_MESSAGE, true);
  }
});

Deno.test('countUrls counts nothing in a message with no links', () => {
  assertEquals(countUrls('My score was wrong on match 12. Can someone check it?'), 0);
  assertEquals(countUrls(''), 0);
});

// A link whose path holds another link. The `www.` and the second `https://`
// are part of the first link, not the start of a new one, but each used to be
// counted as one. Three archived pages scored six and were refused as spam.
Deno.test('countUrls counts a link inside a link only once', () => {
  assertEquals(countUrls('https://web.archive.org/web/20230101000000/https://www.example.com'), 1);
  assertEquals(countUrls('https://example.com/redirect?to=www.target.com'), 1);
  assertEquals(countUrls('https://example.com/r/https://other.test'), 1);
});

Deno.test('countUrls lets three archived links through the spam limit', () => {
  const message = [
    'Here are the three pages I mentioned:',
    'https://web.archive.org/web/20230101000000/https://www.example.com/one',
    'https://web.archive.org/web/20230202000000/https://www.example.com/two',
    'https://web.archive.org/web/20230303000000/https://www.example.com/three',
  ].join('\n');

  assertEquals(countUrls(message), 3);
  assertEquals(countUrls(message) > MAX_URLS_PER_MESSAGE, false);
});

// The body stops at a bracket or a quote too, so links that are wrapped or
// quoted rather than spaced still count separately.
Deno.test('countUrls counts links that are wrapped or quoted', () => {
  assertEquals(countUrls('(www.a.com)(www.b.com)'), 2);
  assertEquals(countUrls('See <https://a.test> and <https://b.test>'), 2);
  assertEquals(countUrls('"https://a.test","https://b.test"'), 2);
});

// Nothing has to precede a link for it to count. Anchoring the match to a
// space or a comma would have missed these.
Deno.test('countUrls counts a link that follows other text directly', () => {
  assertEquals(countUrls('Visit:www.a.com'), 1);
  assertEquals(countUrls('Check www.a.com. Then www.b.com.'), 2);
});

// A blacklist body -- "anything except whitespace, a comma, a semicolon, a
// bracket or a quote" -- had a hole one character over. Joining links on a
// pipe ran them all into a single match, so six scored 1 against a limit of
// five and the flood went through. Any character left off the blacklist was
// another way in, which is why the body names what a URL may contain instead.
Deno.test('countUrls counts links joined by a character that is not in a URL', () => {
  assertEquals(countUrls('https://a.test|https://b.test'), 2);
  assertEquals(countUrls('https://a.test\\https://b.test'), 2);
  assertEquals(countUrls('https://a.test`https://b.test'), 2);
});

Deno.test('countUrls blocks a flood joined by a character that is not in a URL', () => {
  for (const joiner of ['|', '\\', '`', '^', '{']) {
    const message = Array.from({ length: 6 }, (_, i) => `https://spam${i}.test`).join(joiner);
    assertEquals(countUrls(message), 6);
    assertEquals(countUrls(message) > MAX_URLS_PER_MESSAGE, true);
  }
});

// Characters a URL really does carry must not end it, or a long link would
// count more than once.
Deno.test('countUrls keeps a link whole across its own punctuation', () => {
  assertEquals(countUrls('https://a.test/path-to/x_y~z?q=1&r=2#frag'), 1);
  assertEquals(countUrls('www.a-b.com/c+d%20e'), 1);
});

// A link's own characters can join two links as well as a pipe can, so naming
// them was not enough on its own: six links joined on a hyphen read as one.
// The body now also stops at a second link's opening, unless it sits where a
// path would put one.
Deno.test('countUrls counts links joined by a character a URL may carry', () => {
  assertEquals(countUrls('https://a.test-https://b.test'), 2);
  assertEquals(countUrls('https://a.test.https://b.test'), 2);
  assertEquals(countUrls('https://a.test@www.b.test'), 2);
});

Deno.test('countUrls blocks a flood joined by a character a URL may carry', () => {
  for (const joiner of ['-', '.', ':', '_', '~', '#', '&', '?', '@', '%', '+', '!', '*', '$']) {
    const message = Array.from({ length: 6 }, (_, i) => `https://spam${i}.test`).join(joiner);
    assertEquals(countUrls(message), 6);
    assertEquals(countUrls(message) > MAX_URLS_PER_MESSAGE, true);
  }
});

// The exception: a link after "/" or "=" is where a path or a query value
// carries one, so it belongs to the link that owns it. These are the B-63
// cases and they must keep counting once.
Deno.test('countUrls still counts a link carried in a path or a query value', () => {
  assertEquals(countUrls('https://web.archive.org/web/1/https://www.example.com'), 1);
  assertEquals(countUrls('https://example.com/r?to=www.target.com'), 1);
  assertEquals(countUrls('https://example.com/r?to=https://other.test'), 1);
});
