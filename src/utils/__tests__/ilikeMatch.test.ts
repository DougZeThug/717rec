import { describe, expect, it } from 'vitest';

import { matchesIlikeContains } from '../ilikeMatch';

describe('matchesIlikeContains', () => {
  it('finds plain text anywhere, ignoring case', () => {
    expect(matchesIlikeContains('Great game tonight', 'GAME')).toBe(true);
    expect(matchesIlikeContains('Great game tonight', 'match')).toBe(false);
  });

  it('treats % as any run of characters, like the server', () => {
    expect(matchesIlikeContains('I scored 100 points', '100%')).toBe(true);
    expect(matchesIlikeContains('100 agreed', '100%')).toBe(true);
    expect(matchesIlikeContains('bags in the hole', 'bags%hole')).toBe(true);
    expect(matchesIlikeContains('bags\nin the\nhole', 'bags%hole')).toBe(true);
    expect(matchesIlikeContains('hole then bags', 'bags%hole')).toBe(false);
  });

  it('treats _ as exactly one character', () => {
    expect(matchesIlikeContains('team a1 wins', 'a_ wins')).toBe(true);
    expect(matchesIlikeContains('team a wins', 'a_ wins')).toBe(false);
  });

  it('treats a character after a backslash as literal', () => {
    expect(matchesIlikeContains('I am 100% sure', '100\\%')).toBe(true);
    expect(matchesIlikeContains('I scored 100 points', '100\\%')).toBe(false);
    expect(matchesIlikeContains('snake_case', 'e\\_c')).toBe(true);
    expect(matchesIlikeContains('snakeXcase', 'e\\_c')).toBe(false);
  });

  // The server pattern is '%<query>%', so a lone trailing backslash escapes the
  // closing '%' and makes it a literal percent sign.
  it('lets a trailing backslash escape the closing wildcard, like the server', () => {
    expect(matchesIlikeContains('xxfoo%', 'foo\\')).toBe(true);
    expect(matchesIlikeContains('C:\\Users\\', 'Users\\')).toBe(false);
    expect(matchesIlikeContains('foo\\', 'foo\\')).toBe(false);
    expect(matchesIlikeContains('foo% bar', 'foo\\')).toBe(false);
  });

  it('matches the whole text, with the wrapping % supplying the ends', () => {
    expect(matchesIlikeContains('hello world', 'o w')).toBe(true);
    expect(matchesIlikeContains('hello world', '')).toBe(true);
    expect(matchesIlikeContains('multi\nline', 'i%l')).toBe(true);
  });

  it('does not treat regex characters as special', () => {
    expect(matchesIlikeContains('is it (really) over?', '(really)')).toBe(true);
    expect(matchesIlikeContains('abc', 'a.c')).toBe(false);
    expect(matchesIlikeContains('a.c', 'a.c')).toBe(true);
  });
});
