import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

import { ValidationError } from '@/types/errors';

import { parseHeroCardMetadata, parseMetadata, tryParseHeroCardMetadata } from '../parseMetadata';

describe('parseMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses a valid JSON object string', () => {
    const result = parseMetadata('{"key":"value","count":3}');
    expect(result).toEqual({ key: 'value', count: 3 });
  });

  it('returns empty object for a JSON array string (must be an object)', () => {
    const result = parseMetadata('[1,2,3]');
    expect(result).toEqual({});
  });

  it('returns empty object for invalid JSON', () => {
    const result = parseMetadata('not json {{}');
    expect(result).toEqual({});
  });

  it('returns empty object for empty string', () => {
    const result = parseMetadata('');
    expect(result).toEqual({});
  });

  it('calls errorLog when JSON is invalid', async () => {
    const { errorLog } = await import('@/utils/logger');
    parseMetadata('bad json');
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it('does not call errorLog for valid JSON', async () => {
    const { errorLog } = await import('@/utils/logger');
    parseMetadata('{"valid":true}');
    expect(errorLog).not.toHaveBeenCalled();
  });
});

describe('parseHeroCardMetadata', () => {
  it('accepts champions metadata and tolerates extra keys', () => {
    const parsed = parseHeroCardMetadata(
      { champions: { East: 'team-1' }, extra: 'ok' },
      'champions'
    );
    expect(parsed).toEqual({ champions: { East: 'team-1' }, extra: 'ok' });
  });

  it('throws on invalid champions map shape', () => {
    expect(() => parseHeroCardMetadata({ champions: { East: 42 } }, 'champions')).toThrow(
      ValidationError
    );
  });

  it('throws on invalid event winners shape', () => {
    expect(() => parseHeroCardMetadata({ past_winners: [{ week: '1' }] }, 'event')).toThrow(
      ValidationError
    );
  });
});

// The admin form re-parses its JSON box on every keystroke, so it needs the same
// check as an answer rather than a throw.
describe('tryParseHeroCardMetadata', () => {
  it('reads good metadata out of the raw string', () => {
    expect(tryParseHeroCardMetadata('{"champions":{"East":"team-1"}}', 'champions')).toEqual({
      ok: true,
      metadata: { champions: { East: 'team-1' } },
    });
  });

  it('reports a bad shape rather than throwing', () => {
    const result = tryParseHeroCardMetadata('{"champions":{"East":42}}', 'champions');
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty('error', expect.stringContaining('champions must be a map'));
  });

  it('reports each bad event field rather than throwing', () => {
    const result = tryParseHeroCardMetadata('{"buy_in":20}', 'event');
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty('error', expect.stringContaining('buy_in must be a string'));
  });

  // parseMetadata already forgives this, and must keep doing so: half-typed JSON
  // is the normal state of the box, not something to complain about.
  it('treats unparseable JSON as empty, not as an error', () => {
    expect(tryParseHeroCardMetadata('{"buy_in":', 'event')).toEqual({ ok: true, metadata: {} });
  });
});
