import type { ToolContext } from '@lovable.dev/mcp-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getActiveSeasonId as getAuthedSeasonId, userClient } from '../../../tools/_supabase';
import authedGetSchedule from '../../../tools/get-schedule';
import { anonClient, getActiveSeasonId as getPublicSeasonId } from '../_supabase';
import publicGetSchedule from '../get-schedule';

// Only the client construction and the season lookup are stubbed, so the real
// handler wiring runs. Matches the style in standingsTools.test.ts.
vi.mock('../_supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_supabase')>()),
  anonClient: vi.fn(),
  getActiveSeasonId: vi.fn(),
}));
vi.mock('../../../tools/_supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../tools/_supabase')>()),
  userClient: vi.fn(),
  getActiveSeasonId: vi.fn(),
}));

/** Every filter the handler applied, so a predicate change shows up here. */
interface RecordedFilters {
  eq: [string, unknown][];
  not: [string, string, unknown][];
}

const asClient = (stub: object): SupabaseClient => stub as SupabaseClient;
const asCtx = (stub: Partial<ToolContext>): ToolContext => stub as ToolContext;

/**
 * A builder that records filters and resolves to no rows. Each method returns
 * the same object, which is enough for handlers that only chain.
 */
function recordingClient() {
  const filters: RecordedFilters = { eq: [], not: [] };
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      filters.eq.push([column, value]);
      return builder;
    },
    not: (column: string, operator: string, value: unknown) => {
      filters.not.push([column, operator, value]);
      return builder;
    },
    or: () => builder,
    limit: () => builder,
    order: () => builder,
    then: (resolve: (r: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [], error: null }),
  };
  return { client: asClient({ from: () => builder }), filters };
}

const SEASON = 'season-1';

describe('MCP schedule scope predicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * `matches.iscompleted` is nullable and the single-match admin create form
   * never sets it, so `= false` silently dropped every manually created match
   * from the default scope. The live Schedule page shows those rows in its
   * upcoming tab, so the tools have to as well.
   */
  it('keeps never-scored matches in the public upcoming scope', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(anonClient).mockReturnValue(client);
    vi.mocked(getPublicSeasonId).mockResolvedValue({ data: SEASON, error: null });

    await publicGetSchedule.handler(
      { scope: 'upcoming', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(filters.not).toContainEqual(['iscompleted', 'is', true]);
    expect(filters.eq.map(([column]) => column)).not.toContain('iscompleted');
  });

  it('keeps never-scored matches in the authed upcoming scope', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: SEASON, error: null });

    await authedGetSchedule.handler(
      { scope: 'upcoming', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => true, getToken: () => 'token' })
    );

    expect(filters.not).toContainEqual(['iscompleted', 'is', true]);
    expect(filters.eq.map(([column]) => column)).not.toContain('iscompleted');
  });

  /**
   * The other half of the rule: "recent" means genuinely finished, so a NULL
   * row belongs out of it. This predicate must stay a strict `= true`.
   */
  it('still requires a real result in the recent scope', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(anonClient).mockReturnValue(client);
    vi.mocked(getPublicSeasonId).mockResolvedValue({ data: SEASON, error: null });

    await publicGetSchedule.handler(
      { scope: 'recent', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(filters.eq).toContainEqual(['iscompleted', true]);
    expect(filters.not).toHaveLength(0);
  });

  it('does not filter on completion in the all scope', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(anonClient).mockReturnValue(client);
    vi.mocked(getPublicSeasonId).mockResolvedValue({ data: SEASON, error: null });

    await publicGetSchedule.handler(
      { scope: 'all', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(filters.eq.map(([column]) => column)).not.toContain('iscompleted');
    expect(filters.not).toHaveLength(0);
  });
});
