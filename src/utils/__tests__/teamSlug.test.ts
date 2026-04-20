import { describe, expect, it } from 'vitest';

import { isUUID, toTeamSlug } from '../teamSlug';

describe('toTeamSlug', () => {
  it('lowercases and trims', () => {
    expect(toTeamSlug('  Hello World  ')).toBe('hello-world');
  });

  it('converts spaces to hyphens', () => {
    expect(toTeamSlug('Came from Dicks')).toBe('came-from-dicks');
  });

  it('strips apostrophes', () => {
    expect(toTeamSlug("Baggin' & Braggin'")).toBe('baggin-braggin');
  });

  it('strips ampersands', () => {
    expect(toTeamSlug('Rock & Roll')).toBe('rock-roll');
  });

  it('preserves numbers', () => {
    expect(toTeamSlug('3 Amigos')).toBe('3-amigos');
  });

  it('preserves existing hyphens', () => {
    expect(toTeamSlug('T-Baggers')).toBe('t-baggers');
  });

  it('collapses multiple hyphens', () => {
    expect(toTeamSlug('A  &  B')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(toTeamSlug('& Leading')).toBe('leading');
  });

  it('handles trailing spaces', () => {
    expect(toTeamSlug('Smacked ')).toBe('smacked');
  });
});

describe('isUUID', () => {
  it('returns true for a valid v4 UUID', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for uppercase UUID', () => {
    expect(isUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isUUID('')).toBe(false);
  });

  it('returns false for plain string', () => {
    expect(isUUID('not-a-uuid')).toBe(false);
  });

  it('returns false for UUID missing segments', () => {
    expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('returns false for slug-like strings', () => {
    expect(isUUID('team-slug-here')).toBe(false);
  });
});
