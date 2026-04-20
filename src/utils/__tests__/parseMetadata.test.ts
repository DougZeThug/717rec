import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  timezoneLog: vi.fn(),
}));

import { parseMetadata } from '../parseMetadata';

describe('parseMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses a valid JSON object string', () => {
    const result = parseMetadata('{"key":"value","count":3}');
    expect(result).toEqual({ key: 'value', count: 3 });
  });

  it('parses a valid JSON array string', () => {
    const result = parseMetadata('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
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
