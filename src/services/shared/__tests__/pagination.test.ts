import { describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

// Import after mocks
import { fetchAllPages, SUPABASE_PAGE_SIZE } from '../pagination';

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

describe('fetchAllPages', () => {
  it('returns a single short page without requesting more', async () => {
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPages<number>(
      (from, to) => {
        calls.push([from, to]);
        return Promise.resolve({ data: [1, 2], error: null });
      },
      'ctx',
      5
    );
    expect(rows).toEqual([1, 2]);
    expect(calls).toEqual([[0, 4]]);
  });

  it('pages through full pages until a short page, accumulating every row', async () => {
    const calls: Array<[number, number]> = [];
    const pages = [[1, 2], [3, 4], [5]]; // pageSize 2: full, full, short
    let i = 0;
    const rows = await fetchAllPages<number>(
      (from, to) => {
        calls.push([from, to]);
        return Promise.resolve({ data: pages[i++], error: null });
      },
      'ctx',
      2
    );
    expect(rows).toEqual([1, 2, 3, 4, 5]);
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it('treats null data as an empty final page', async () => {
    const rows = await fetchAllPages<number>(
      () => Promise.resolve({ data: null, error: null }),
      'ctx',
      2
    );
    expect(rows).toEqual([]);
  });

  it('stops after an exact multiple of the page size (one extra empty page)', async () => {
    const calls: Array<[number, number]> = [];
    const pages = [[1, 2], []]; // exactly one full page, then empty
    let i = 0;
    const rows = await fetchAllPages<number>(
      (from, to) => {
        calls.push([from, to]);
        return Promise.resolve({ data: pages[i++], error: null });
      },
      'ctx',
      2
    );
    expect(rows).toEqual([1, 2]);
    expect(calls).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('throws DatabaseError when a page returns an error', async () => {
    await expect(
      fetchAllPages<number>(() => Promise.resolve({ data: null, error: pgError() }), 'ctx', 2)
    ).rejects.toThrow(DatabaseError);
  });

  it('defaults to the PostgREST 1,000-row page size', async () => {
    const calls: Array<[number, number]> = [];
    await fetchAllPages<number>((from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: [], error: null });
    }, 'ctx');
    expect(calls).toEqual([[0, SUPABASE_PAGE_SIZE - 1]]);
  });
});
