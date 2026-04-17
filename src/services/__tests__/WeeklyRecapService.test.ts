import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(),
}));

vi.mock('@/utils/rankingUtils/calculateStreak', () => ({
  calculateStreak: vi.fn().mockReturnValue(null),
}));

// Import after mocks
import { WeeklyRecapService } from '../WeeklyRecapService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyState = { weekNumber: null, upsets: [], hotStreaks: [], hasData: false };

// Builds a minimal chain that always resolves with the given result
function makeChain(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result);
  const leafChain = Object.assign(Promise.resolve(result), {
    single: () => Promise.resolve(result),
    not: () => Promise.resolve(result),
    limit: () => ({ single: () => Promise.resolve(result) }),
    order: () => leafChain,
  });
  return Object.assign(resolved, {
    eq: () => leafChain,
    is: () => leafChain,
    not: () => leafChain,
    in: () => Promise.resolve(result),
    neq: () => Promise.resolve(result),
    gte: () => leafChain,
    lt: () => Promise.resolve(result),
    order: () => leafChain,
    single: () => Promise.resolve(result),
    limit: () => ({ single: () => Promise.resolve(result) }),
  });
}

// ─── fetchWeeklyRecap ─────────────────────────────────────────────────────────

describe('WeeklyRecapService.fetchWeeklyRecap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty state when no active season found', async () => {
    mockFrom.mockReturnValue({ select: () => makeChain({ data: null, error: null }) });
    const result = await WeeklyRecapService.fetchWeeklyRecap();
    expect(result).toEqual(emptyState);
  });

  it('returns empty state when any error is thrown (caught by try/catch)', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('unexpected error');
    });
    const result = await WeeklyRecapService.fetchWeeklyRecap();
    expect(result).toEqual(emptyState);
  });

  it('returns empty state when no completed matches with dates', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === 'seasons' && callCount === 1) {
        // First seasons call → active season
        return { select: () => makeChain({ data: { id: 's-1', start_date: '2026-01-01' }, error: null }) };
      }
      // matches call → no match date
      return { select: () => makeChain({ data: null, error: null }) };
    });
    const result = await WeeklyRecapService.fetchWeeklyRecap();
    // No match date and no hot streaks → hasData = false
    expect(result.weekNumber).toBeNull();
    expect(result.upsets).toEqual([]);
  });

  it('returns hasData=false when service errors are swallowed', async () => {
    // Simulate a Supabase error on the seasons query
    mockFrom.mockReturnValue({
      select: () => {
        throw new Error('network error');
      },
    });
    const result = await WeeklyRecapService.fetchWeeklyRecap();
    expect(result.hasData).toBe(false);
  });
});
