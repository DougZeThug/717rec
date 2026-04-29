import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

vi.mock('@/utils/matchTransformers', () => ({
  transformDatabasePlayoffMatchesWithTeams: vi.fn((data) => data),
}));

// Import after mocks
import {
  fetchBmMatchData,
  fetchBmMatchWithStage,
  fetchBracketInfo,
  fetchBracketParticipants,
  fetchBracketsForSelector,
  fetchBracketsManagerMatchData,
  fetchBracketsOverview,
  fetchBracketWithDivision,
  fetchFinalStandings,
  fetchGroupsAndMatches,
  fetchParticipantsByIds,
  fetchPlayoffBracketData,
  fetchPlayoffMatches,
  fetchPlayoffMatchTeams,
  fetchPlayoffMatchWithBracket,
  fetchPlayoffTeams,
  fetchStageAndParticipants,
  fetchTeamsByNames,
  validateSeeds,
} from '../BracketReadService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed', code = '42P01') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeBracket = () => ({
  id: 'b-1',
  title: 'Gold Bracket',
  format: 'single_elimination',
  state: 'pending',
  division_id: 'd-1',
  challonge_tournament_id: null,
  uses_brackets_manager: false,
  created_at: '2026-01-01T00:00:00Z',
  wb_champion_id: null,
  bracket_data: null,
  migrated: false,
  migrated_at: null,
  reset_match_needed: false,
});

// ─── fetchBracketsForSelector ─────────────────────────────────────────────────

describe('fetchBracketsForSelector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns bracket options on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: [{ id: 'b-1', title: 'Gold Bracket' }], error: null }),
      }),
    });
    const result = await fetchBracketsForSelector();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b-1');
  });

  it('returns empty array when null', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await fetchBracketsForSelector()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchBracketsForSelector()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPlayoffBracketData ──────────────────────────────────────────────────

describe('fetchPlayoffBracketData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped bracket on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: makeBracket(), error: null }) }),
      }),
    });
    const result = await fetchPlayoffBracketData('b-1');
    expect(result.id).toBe('b-1');
    expect(result.state).toBe('pending');
  });

  it('throws NotFoundError when bracket not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    await expect(fetchPlayoffBracketData('b-missing')).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchPlayoffBracketData('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPlayoffMatches ──────────────────────────────────────────────────────

describe('fetchPlayoffMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no matches', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ order: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      }),
    });
    expect(await fetchPlayoffMatches('b-1')).toEqual([]);
  });

  it('returns transformed matches on success', async () => {
    const row = {
      id: 'm-1',
      bracket_id: 'b-1',
      round: 1,
      position: 0,
      team1: null,
      team2: null,
      playoff_games: [],
    };
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ order: () => Promise.resolve({ data: [row], error: null }) }),
        }),
      }),
    });
    const result = await fetchPlayoffMatches('b-1');
    expect(result).toHaveLength(1);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      }),
    });
    await expect(fetchPlayoffMatches('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── validateSeeds ────────────────────────────────────────────────────────────

describe('validateSeeds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns validation result on success', async () => {
    mockRpc.mockResolvedValue({ data: [{ is_valid: true }], error: null });
    const result = await validateSeeds('d-1');
    expect(result).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledWith('validate_division_seeds', { p_division_id: 'd-1' });
  });

  it('returns empty array when null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    expect(await validateSeeds('d-1')).toEqual([]);
  });

  it('throws DatabaseError on rpc error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(validateSeeds('d-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBracketParticipants ─────────────────────────────────────────────────

describe('fetchBracketParticipants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns participants on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({ data: [{ id: 1, name: 'Eagles', position: 1 }], error: null }),
        }),
      }),
    });
    const result = await fetchBracketParticipants('b-1');
    expect(result).toHaveLength(1);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchBracketParticipants('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBracketsOverview ────────────────────────────────────────────────────

describe('fetchBracketsOverview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all brackets without season filter', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: [{ id: 'b-1', title: 'Gold' }], error: null }),
      }),
    });
    const result = await fetchBracketsOverview();
    expect(result).toHaveLength(1);
  });

  it('applies season filter when provided', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          eq: () => Promise.resolve({ data: [{ id: 'b-1' }], error: null }),
        }),
      }),
    });
    const result = await fetchBracketsOverview('s-1');
    expect(result).toHaveLength(1);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: pgError() }),
      }),
    });
    await expect(fetchBracketsOverview()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBracketInfo ─────────────────────────────────────────────────────────

describe('fetchBracketInfo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns bracket info on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: makeBracket(), error: null }) }),
      }),
    });
    const result = await fetchBracketInfo('b-1');
    expect(result).toMatchObject({ id: 'b-1' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchBracketInfo('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchFinalStandings ──────────────────────────────────────────────────────

describe('fetchFinalStandings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns standings on success', async () => {
    const row = {
      placement: 1,
      wins: 3,
      losses: 0,
      game_wins: 6,
      game_losses: 1,
      teams: { id: 't-1', name: 'Eagles', logo_url: null, image_url: null },
    };
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ not: () => ({ order: () => Promise.resolve({ data: [row], error: null }) }) }),
      }),
    });
    const result = await fetchFinalStandings('b-1');
    expect(result).toHaveLength(1);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          not: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      }),
    });
    await expect(fetchFinalStandings('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPlayoffTeams ────────────────────────────────────────────────────────

describe('fetchPlayoffTeams', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns merged team data on success', async () => {
    const teamDetailRow = {
      team_id: 't-1',
      name: 'Eagles',
      logo_url: null,
      image_url: null,
      division_id: 'd-1',
      divisionname: 'Gold',
      wins: 5,
      losses: 1,
      game_wins: 10,
      game_losses: 3,
      players: [],
      power_score: 80,
      sos: 0.6,
      win_percentage: 0.83,
      game_win_percentage: 0.77,
      close_match_losses: 0,
    };
    const seedRow = { id: 't-1', seed: 2 };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_team_details') {
        return { select: () => Promise.resolve({ data: [teamDetailRow], error: null }) };
      }
      return { select: () => Promise.resolve({ data: [seedRow], error: null }) };
    });
    const result = await fetchPlayoffTeams();
    expect(result).toHaveLength(1);
    expect(result[0].seed).toBe(2);
    expect(result[0].name).toBe('Eagles');
  });

  it('throws DatabaseError when team details query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_team_details') {
        return { select: () => Promise.resolve({ data: null, error: pgError() }) };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    });
    await expect(fetchPlayoffTeams()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBmMatchWithStage ────────────────────────────────────────────────────

describe('fetchBmMatchWithStage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns match data on success', async () => {
    const row = {
      id: 1,
      stage_id: 10,
      group_id: 1,
      round_id: 1,
      number: 1,
      status: 'pending',
      opponent1_id: 1,
      opponent1_score: null,
      opponent1_result: null,
      opponent2_id: 2,
      opponent2_score: null,
      opponent2_result: null,
      child_count: 0,
      stage: {
        id: 10,
        name: 'Stage 1',
        type: 'single_elimination',
        tournament_id: 'b-1',
        number: 1,
        settings: {},
      },
    };
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
    });
    const result = await fetchBmMatchWithStage(1);
    expect(result).toMatchObject({ id: 1 });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchBmMatchWithStage(1)).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPlayoffMatchWithBracket ─────────────────────────────────────────────

describe('fetchPlayoffMatchWithBracket', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns match data on success', async () => {
    const row = {
      id: 'm-1',
      bracket_id: 'b-1',
      bracket: { id: 'b-1', uses_brackets_manager: false },
      playoff_games: [],
    };
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
    });
    const result = await fetchPlayoffMatchWithBracket('m-1');
    expect(result).toMatchObject({ id: 'm-1' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchPlayoffMatchWithBracket('m-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBmMatchData ─────────────────────────────────────────────────────────

describe('fetchBmMatchData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns match opponent data on success', async () => {
    const row = { opponent1_id: 1, opponent2_id: 2, stage_id: 10 };
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
    });
    const result = await fetchBmMatchData(1);
    expect(result).toMatchObject({ opponent1_id: 1 });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchBmMatchData(1)).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchParticipantsByIds ───────────────────────────────────────────────────

describe('fetchParticipantsByIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns participants on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        in: () =>
          Promise.resolve({ data: [{ id: 1, name: 'Eagles', tournament_id: 'b-1' }], error: null }),
      }),
    });
    const result = await fetchParticipantsByIds([1]);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ in: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await fetchParticipantsByIds([1])).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ in: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchParticipantsByIds([1])).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPlayoffMatchTeams ───────────────────────────────────────────────────

describe('fetchPlayoffMatchTeams', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns team ids on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { team1_id: 't1', team2_id: 't2' }, error: null }),
        }),
      }),
    });
    const result = await fetchPlayoffMatchTeams('m-1');
    expect(result).toMatchObject({ team1_id: 't1' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchPlayoffMatchTeams('m-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBracketWithDivision ─────────────────────────────────────────────────

describe('fetchBracketWithDivision', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns bracket data on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: makeBracket(), error: null }) }),
      }),
    });
    const result = await fetchBracketWithDivision('b-1');
    expect(result).toMatchObject({ id: 'b-1' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchBracketWithDivision('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchStageAndParticipants ────────────────────────────────────────────────

describe('fetchStageAndParticipants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns stages and participants on success', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data:
              table === 'stage'
                ? [{ id: 1, name: 'Stage 1', type: 'single_elimination', tournament_id: 'b-1' }]
                : [{ id: 1, name: 'Eagles', position: 1, tournament_id: 'b-1' }],
            error: null,
          }),
      }),
    }));
    const result = await fetchStageAndParticipants('b-1');
    expect(result.stages).toHaveLength(1);
    expect(result.participants).toHaveLength(1);
  });

  it('throws DatabaseError when stage query fails', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: null,
            error: table === 'stage' ? pgError() : null,
          }),
      }),
    }));
    await expect(fetchStageAndParticipants('b-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchGroupsAndMatches ────────────────────────────────────────────────────

describe('fetchGroupsAndMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns groups and matches on success', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data:
              table === 'group' ? [{ id: 1, number: 1, stage_id: 10 }] : [{ id: 1, group_id: 1 }],
            error: null,
          }),
      }),
    }));
    const result = await fetchGroupsAndMatches(10);
    expect(result.groups).toHaveLength(1);
    expect(result.matches).toHaveLength(1);
  });

  it('throws DatabaseError when groups query fails', async () => {
    mockFrom.mockImplementation((table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: null,
            error: table === 'group' ? pgError() : null,
          }),
      }),
    }));
    await expect(fetchGroupsAndMatches(10)).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamsByNames ────────────────────────────────────────────────────────

describe('fetchTeamsByNames', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns teams on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        in: () =>
          Promise.resolve({ data: [{ id: 't-1', name: 'Eagles', image_url: null }], error: null }),
      }),
    });
    const result = await fetchTeamsByNames(['Eagles']);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ in: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await fetchTeamsByNames(['Eagles'])).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ in: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchTeamsByNames(['Eagles'])).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBracketsManagerMatchData ───────────────────────────────────────────

describe('fetchBracketsManagerMatchData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns combined match data on success', async () => {
    const matchRow = {
      id: 1,
      stage_id: 10,
      group_id: 1,
      round_id: 1,
      number: 1,
      status: 'pending',
      opponent1_id: 1,
      opponent1_score: null,
      opponent1_result: null,
      opponent2_id: 2,
      opponent2_score: null,
      opponent2_result: null,
    };
    const gamesRow = [
      {
        id: 'g-1',
        number: 1,
        match_id: 1,
        status: 'pending',
        opponent1_score: null,
        opponent2_score: null,
      },
    ];

    let tableCallIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'match') {
        tableCallIdx++;
        if (tableCallIdx === 1) {
          // First match call: maybeSingle for main match
          return {
            select: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: matchRow, error: null }) }),
            }),
          };
        }
        // Second match call for games won't happen as it's match_game
        return {
          select: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
          }),
        };
      }
      if (table === 'match_game') {
        return {
          select: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: gamesRow, error: null }) }),
          }),
        };
      }
      // participant
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { id: 1, name: 'Eagles', team_id: 't-1' }, error: null }),
          }),
        }),
      };
    });

    const result = await fetchBracketsManagerMatchData(1);
    expect(result.matchData.id).toBe(1);
    expect(result.gamesData).toHaveLength(1);
  });

  it('throws NotFoundError when match not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    await expect(fetchBracketsManagerMatchData(99)).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError on match query error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchBracketsManagerMatchData(1)).rejects.toThrow(DatabaseError);
  });
});
