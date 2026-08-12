import { beforeEach, describe, expect, it, vi } from 'vitest';

// Only the Supabase client construction and the season lookup are stubbed. The
// real isHiddenTeamRow / textResult / errorResult run, so these tests exercise
// the handler wiring rather than a reimplementation of it.
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

import * as authedSupabase from '../../../tools/_supabase';
import authedGetStandings from '../../../tools/get-standings';
import authedListTeams from '../../../tools/list-teams';
import * as publicSupabase from '../_supabase';
import publicGetStandings from '../get-standings';
import publicListTeams from '../list-teams';

type Row = Record<string, unknown>;

interface QueryCalls {
  table?: string;
  select?: string;
  ilike: [string, string][];
}

/**
 * Minimal stand-in for the PostgREST builder. Only .order() resolves, matching
 * the real call shape: await supabase.from(t).select(s).eq(...).order(...).
 */
function makeClient(rows: Row[], error: { message: string } | null = null) {
  const calls: QueryCalls = { ilike: [] };
  const builder = {
    select(s: string) {
      calls.select = s;
      return builder;
    },
    eq() {
      return builder;
    },
    ilike(col: string, val: string) {
      calls.ilike.push([col, val]);
      return builder;
    },
    order() {
      return Promise.resolve({ data: error ? null : rows, error });
    },
  };
  return {
    client: {
      from(table: string) {
        calls.table = table;
        return builder;
      },
    },
    calls,
  };
}

/** First text block of a tool result. ToolHandlerResult's content is a union, so read it structurally. */
function textOf(result: unknown): string | undefined {
  return (result as { content?: { text?: string }[] }).content?.[0]?.text;
}

function parse(result: unknown) {
  return JSON.parse(textOf(result) ?? 'null');
}

const ctx = { isAuthenticated: () => true, getToken: () => 'tok' } as never;

// A team whose cached division_name is stale: team_season_stats still says
// Recreational, but the team has actually been moved to Hidden.
const STALE_HIDDEN: Row = {
  team_id: 'h',
  division_name: 'Recreational',
  match_wins: 1,
  match_losses: 0,
  game_wins: 2,
  game_losses: 0,
  power_score: 0.9,
  teams: { name: 'Dropped Out', divisions: { display_division: 'Hidden', name: 'Hidden' } },
};

const VISIBLE_A: Row = {
  team_id: 'a',
  division_name: 'Competitive',
  match_wins: 3,
  match_losses: 0,
  game_wins: 6,
  game_losses: 1,
  power_score: 0.8,
  teams: { name: 'Alpha', divisions: { display_division: 'Competitive', name: 'Competitive Low' } },
};

const VISIBLE_B: Row = {
  team_id: 'b',
  division_name: 'Competitive',
  match_wins: 1,
  match_losses: 2,
  game_wins: 3,
  game_losses: 4,
  power_score: 0.5,
  teams: { name: 'Bravo', divisions: { display_division: 'Competitive', name: 'Competitive Low' } },
};

beforeEach(() => {
  vi.mocked(publicSupabase.getActiveSeasonId).mockResolvedValue('season-1');
  vi.mocked(authedSupabase.getActiveSeasonId).mockResolvedValue('season-1');
});

describe('public get_standings handler', () => {
  it('drops a team whose live division is Hidden even though the cached label is not', async () => {
    const { client } = makeClient([VISIBLE_A, STALE_HIDDEN, VISIBLE_B]);
    vi.mocked(publicSupabase.anonClient).mockReturnValue(client as never);

    const rows = parse(await publicGetStandings.handler({ division: undefined }, ctx));

    expect(rows.map((r: Row) => r.team_id)).toEqual(['a', 'b']);
    expect(rows.some((r: Row) => r.team_name === 'Dropped Out')).toBe(false);
  });

  // The filter has to run before rank is assigned. If it ran after, removing a
  // team would leave a gap and the list would read 1, 3.
  it('keeps ranks contiguous after filtering', async () => {
    const { client } = makeClient([VISIBLE_A, STALE_HIDDEN, VISIBLE_B]);
    vi.mocked(publicSupabase.anonClient).mockReturnValue(client as never);

    const rows = parse(await publicGetStandings.handler({ division: undefined }, ctx));

    expect(rows.map((r: Row) => r.rank)).toEqual([1, 2]);
  });

  it('does not leak the embedded join into the payload', async () => {
    const { client } = makeClient([VISIBLE_A]);
    vi.mocked(publicSupabase.anonClient).mockReturnValue(client as never);

    const rows = parse(await publicGetStandings.handler({ division: undefined }, ctx));

    expect(rows[0]).not.toHaveProperty('teams');
    expect(rows[0]).not.toHaveProperty('divisions');
    expect(rows[0].team_name).toBe('Alpha');
  });

  it('passes a division filter through to the query', async () => {
    const { client, calls } = makeClient([VISIBLE_A]);
    vi.mocked(publicSupabase.anonClient).mockReturnValue(client as never);

    await publicGetStandings.handler({ division: 'Competitive' }, ctx);

    expect(calls.ilike).toEqual([['division_name', 'Competitive']]);
  });

  it('returns an empty list when there is no active season', async () => {
    vi.mocked(publicSupabase.getActiveSeasonId).mockResolvedValue(null);
    const { client } = makeClient([VISIBLE_A]);
    vi.mocked(publicSupabase.anonClient).mockReturnValue(client as never);

    expect(parse(await publicGetStandings.handler({ division: undefined }, ctx))).toEqual([]);
  });

  it('surfaces a query error instead of returning rows', async () => {
    const { client } = makeClient([], { message: 'boom' });
    vi.mocked(publicSupabase.anonClient).mockReturnValue(client as never);

    const result = await publicGetStandings.handler({ division: undefined }, ctx);

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('boom');
  });
});

describe('public list_teams handler', () => {
  it('applies the same live-division filter', async () => {
    const { client } = makeClient([VISIBLE_A, STALE_HIDDEN]);
    vi.mocked(publicSupabase.anonClient).mockReturnValue(client as never);

    const rows = parse(await publicListTeams.handler({ division: undefined }, ctx));

    expect(rows.map((r: Row) => r.team_id)).toEqual(['a']);
  });
});

describe('authenticated tools', () => {
  it('get_standings refuses an unauthenticated caller', async () => {
    const result = await authedGetStandings.handler({ division: undefined }, {
      isAuthenticated: () => false,
    } as never);

    expect(result.isError).toBe(true);
  });

  it('list_teams refuses an unauthenticated caller', async () => {
    const result = await authedListTeams.handler({ division: undefined }, {
      isAuthenticated: () => false,
    } as never);

    expect(result.isError).toBe(true);
  });

  it('get_standings filters hidden teams for authenticated callers too', async () => {
    const { client } = makeClient([VISIBLE_A, STALE_HIDDEN]);
    vi.mocked(authedSupabase.userClient).mockReturnValue(client as never);

    const rows = parse(await authedGetStandings.handler({ division: undefined }, ctx));

    expect(rows.map((r: Row) => r.team_id)).toEqual(['a']);
  });
});

// The live-division check only works if every tool actually asks for the join.
// Forgetting it in one file would silently fall back to the cached label, which
// is exactly the defect this was meant to fix -- and no assertion above would
// notice, because the fixtures always supply the embed.
describe('every standings query requests the division join', () => {
  it.each([
    ['public get_standings', publicGetStandings, publicSupabase, 'anonClient'],
    ['public list_teams', publicListTeams, publicSupabase, 'anonClient'],
    ['authed get_standings', authedGetStandings, authedSupabase, 'userClient'],
    ['authed list_teams', authedListTeams, authedSupabase, 'userClient'],
  ] as const)('%s', async (_label, tool, mod, clientFn) => {
    const { client, calls } = makeClient([]);
    vi.mocked((mod as Record<string, unknown>)[clientFn] as () => unknown).mockReturnValue(
      client as never
    );

    await tool.handler({ division: undefined }, ctx);

    expect(calls.table).toBe('team_season_stats');
    expect(calls.select).toContain('divisions(name, display_division)');
  });
});
