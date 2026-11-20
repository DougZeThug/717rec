import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError, NotFoundError } from '@/types/errors';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

import { ChallongeFallbackService } from '../ChallongeFallbackService';

const pgError = (msg = 'boom') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeConfig = () => ({
  id: 'cfg-1',
  enabled: true,
  header_title: 'Playoffs',
  header_subtitle: 'subtitle',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const makeBracket = (overrides: Record<string, unknown> = {}) => ({
  id: 'b-1',
  title: 'Competitive',
  slug: 'abc123',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('ChallongeFallbackService.fetchConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the config row', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: makeConfig(), error: null }),
          }),
        }),
      }),
    });
    const result = await ChallongeFallbackService.fetchConfig();
    expect(result.id).toBe('cfg-1');
    expect(result.enabled).toBe(true);
  });

  it('throws NotFoundError when no row exists', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    });
    await expect(ChallongeFallbackService.fetchConfig()).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError on supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: pgError() }),
          }),
        }),
      }),
    });
    await expect(ChallongeFallbackService.fetchConfig()).rejects.toThrow(DatabaseError);
  });
});

describe('ChallongeFallbackService.updateConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the updated row', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { ...makeConfig(), enabled: false }, error: null }),
          }),
        }),
      }),
    });
    const result = await ChallongeFallbackService.updateConfig({ id: 'cfg-1', enabled: false });
    expect(result.enabled).toBe(false);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: pgError() }),
          }),
        }),
      }),
    });
    await expect(
      ChallongeFallbackService.updateConfig({ id: 'cfg-1', enabled: false })
    ).rejects.toThrow(DatabaseError);
  });
});

describe('ChallongeFallbackService.fetchBrackets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the bracket list', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: [makeBracket()], error: null }),
        }),
      }),
    });
    const result = await ChallongeFallbackService.fetchBrackets();
    expect(result).toHaveLength(1);
  });

  it('returns [] when data is null', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });
    expect(await ChallongeFallbackService.fetchBrackets()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: null, error: pgError() }),
        }),
      }),
    });
    await expect(ChallongeFallbackService.fetchBrackets()).rejects.toThrow(DatabaseError);
  });
});

describe('ChallongeFallbackService.createBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the new row', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          maybeSingle: () => Promise.resolve({ data: makeBracket(), error: null }),
        }),
      }),
    });
    const result = await ChallongeFallbackService.createBracket({
      title: 'Competitive',
      slug: 'abc123',
      sort_order: 0,
    });
    expect(result.id).toBe('b-1');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: pgError() }),
        }),
      }),
    });
    await expect(
      ChallongeFallbackService.createBracket({ title: 't', slug: 's', sort_order: 0 })
    ).rejects.toThrow(DatabaseError);
  });
});

describe('ChallongeFallbackService.updateBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the updated row', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: makeBracket({ title: 'New' }), error: null }),
          }),
        }),
      }),
    });
    const result = await ChallongeFallbackService.updateBracket({ id: 'b-1', title: 'New' });
    expect(result.title).toBe('New');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: pgError() }),
          }),
        }),
      }),
    });
    await expect(ChallongeFallbackService.updateBracket({ id: 'b-1', title: 'X' })).rejects.toThrow(
      DatabaseError
    );
  });
});

describe('ChallongeFallbackService.deleteBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  // delete -> eq -> select -> maybeSingle
  const mockDelete = (result: { data: unknown; error: unknown }) => {
    const maybeSingle = vi.fn(() => Promise.resolve(result));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const del = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ delete: del });
    return { eq, select };
  };

  it('resolves on success', async () => {
    const { eq, select } = mockDelete({ data: { id: 'b-1' }, error: null });

    await expect(ChallongeFallbackService.deleteBracket('b-1')).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('challonge_fallback_brackets');
    expect(eq).toHaveBeenCalledWith('id', 'b-1');
    expect(select).toHaveBeenCalledWith('id');
  });

  it('throws DatabaseError on error', async () => {
    mockDelete({ data: null, error: pgError() });

    await expect(ChallongeFallbackService.deleteBracket('b-1')).rejects.toThrow(DatabaseError);
  });

  // The defect: the row is already gone, or row-level security hides it
  // without an error. The delete came back empty and the admin saw "Removed".
  it('throws BusinessLogicError when no row was deleted', async () => {
    mockDelete({ data: null, error: null });

    const thrown = await ChallongeFallbackService.deleteBracket('b-1').catch(
      (error: unknown) => error
    );

    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect((thrown as Error).message).toMatch(/Nothing was deleted. This bracket/);
  });
});
