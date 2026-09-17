import type { ToolContext } from '@lovable.dev/mcp-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getActiveSeasonId as getAuthedSeasonId,
  getApprovedTeamId,
  userClient,
} from '../../../tools/_supabase';
import getMyUpcomingMatches from '../../../tools/get-my-upcoming-matches';
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
  getApprovedTeamId: vi.fn(),
}));

/** Every filter the handler applied, so a predicate change shows up here. */
interface RecordedFilters {
  eq: [string, unknown][];
  not: [string, string, unknown][];
  or: string[];
}

const asClient = (stub: object): SupabaseClient => stub as SupabaseClient;
const asCtx = (stub: Partial<ToolContext>): ToolContext => stub as ToolContext;

/**
 * A builder that records filters and resolves to no rows. Each method returns
 * the same object, which is enough for handlers that only chain.
 */
function recordingClient(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  const filters: RecordedFilters = { eq: [], not: [], or: [] };
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
    or: (expression: string) => {
      filters.or.push(expression);
      return builder;
    },
    limit: () => builder,
    order: () => builder,
    then: (resolve: (r: { data: unknown; error: unknown }) => unknown) => resolve(result),
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

  it('requires a real result in the authed recent scope too', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: SEASON, error: null });

    await authedGetSchedule.handler(
      { scope: 'recent', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => true, getToken: () => 'token' })
    );

    expect(filters.eq).toContainEqual(['iscompleted', true]);
    expect(filters.not).toHaveLength(0);
  });

  it('does not filter on completion in the authed all scope', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: SEASON, error: null });

    await authedGetSchedule.handler(
      { scope: 'all', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => true, getToken: () => 'token' })
    );

    expect(filters.eq.map(([column]) => column)).not.toContain('iscompleted');
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

  it('narrows to one team when a team id is given', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(anonClient).mockReturnValue(client);
    vi.mocked(getPublicSeasonId).mockResolvedValue({ data: SEASON, error: null });

    await publicGetSchedule.handler(
      { scope: 'upcoming', teamId: '11111111-1111-4111-8111-111111111111', limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    // The team filter must not displace the completion predicate.
    expect(filters.or).toHaveLength(1);
    expect(filters.not).toContainEqual(['iscompleted', 'is', true]);
  });

  it('passes a season lookup failure back to the caller', async () => {
    const { client } = recordingClient();
    vi.mocked(anonClient).mockReturnValue(client);
    vi.mocked(getPublicSeasonId).mockResolvedValue({ data: null, error: 'seasons unavailable' });

    const result = await publicGetSchedule.handler(
      { scope: 'upcoming', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(result.isError).toBe(true);
  });

  it('answers with no matches between seasons rather than erroring', async () => {
    const { client } = recordingClient();
    vi.mocked(anonClient).mockReturnValue(client);
    vi.mocked(getPublicSeasonId).mockResolvedValue({ data: null, error: null });

    const result = await publicGetSchedule.handler(
      { scope: 'upcoming', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ data: [] });
  });

  it('passes a failed match query back to the caller', async () => {
    const { client } = recordingClient({ data: null, error: { message: 'matches unavailable' } });
    vi.mocked(anonClient).mockReturnValue(client);
    vi.mocked(getPublicSeasonId).mockResolvedValue({ data: SEASON, error: null });

    const result = await publicGetSchedule.handler(
      { scope: 'upcoming', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(result.isError).toBe(true);
  });

  it('refuses an anonymous caller on the authed server', async () => {
    const result = await authedGetSchedule.handler(
      { scope: 'upcoming', teamId: undefined, limit: 50 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(result.isError).toBe(true);
    expect(userClient).not.toHaveBeenCalled();
  });
});

/**
 * The tool that IS "upcoming". Its predicate carried the same bug, and the
 * handler had no test at all -- every guard below was unexercised.
 */
describe('get_my_upcoming_matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const signedIn = () => asCtx({ isAuthenticated: () => true, getUserId: () => 'user-1' });

  it('keeps never-scored matches, the same as the Schedule page', async () => {
    const { client, filters } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: SEASON, error: null });
    vi.mocked(getApprovedTeamId).mockResolvedValue({ data: { team_id: 'team-1' }, error: null });

    await getMyUpcomingMatches.handler({ limit: 10 }, signedIn());

    expect(filters.not).toContainEqual(['iscompleted', 'is', true]);
    expect(filters.eq.map(([column]) => column)).not.toContain('iscompleted');
  });

  it('refuses an anonymous caller', async () => {
    const result = await getMyUpcomingMatches.handler(
      { limit: 10 },
      asCtx({ isAuthenticated: () => false })
    );

    expect(result.isError).toBe(true);
    expect(userClient).not.toHaveBeenCalled();
  });

  it('passes a season lookup failure back to the caller', async () => {
    const { client } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: null, error: 'seasons unavailable' });

    const result = await getMyUpcomingMatches.handler({ limit: 10 }, signedIn());

    expect(result.isError).toBe(true);
    expect(getApprovedTeamId).not.toHaveBeenCalled();
  });

  it('answers with no matches between seasons rather than erroring', async () => {
    const { client } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: null, error: null });

    const result = await getMyUpcomingMatches.handler({ limit: 10 }, signedIn());

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ data: [] });
  });

  it('passes a membership lookup failure back to the caller', async () => {
    const { client } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: SEASON, error: null });
    vi.mocked(getApprovedTeamId).mockResolvedValue({ data: null, error: 'two memberships' });

    const result = await getMyUpcomingMatches.handler({ limit: 10 }, signedIn());

    expect(result.isError).toBe(true);
  });

  it('answers with no matches when the caller is on no approved team', async () => {
    const { client } = recordingClient();
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: SEASON, error: null });
    vi.mocked(getApprovedTeamId).mockResolvedValue({ data: null, error: null });

    const result = await getMyUpcomingMatches.handler({ limit: 10 }, signedIn());

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ data: [] });
  });

  it('passes a failed match query back to the caller', async () => {
    const { client } = recordingClient({ data: null, error: { message: 'matches unavailable' } });
    vi.mocked(userClient).mockReturnValue(client);
    vi.mocked(getAuthedSeasonId).mockResolvedValue({ data: SEASON, error: null });
    vi.mocked(getApprovedTeamId).mockResolvedValue({ data: { team_id: 'team-1' }, error: null });

    const result = await getMyUpcomingMatches.handler({ limit: 10 }, signedIn());

    expect(result.isError).toBe(true);
  });
});
