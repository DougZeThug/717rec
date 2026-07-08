import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveScoringNotEnabledError, ValidationError } from '@/types/errors';

// ─── Supabase mock (liveDb wraps the same client module) ─────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table), rpc: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

// Import after mocks
import { TeamPlayersService } from '../TeamPlayersService';

const pgError = (code: string, msg = 'query failed') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const playerRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  team_id: 'team-1',
  display_name: 'Doug',
  profile_id: null,
  is_active: true,
  created_at: '2026-07-08T18:00:00Z',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchTeamPlayers', () => {
  it('returns active players for the team', async () => {
    const eq2 = vi.fn(() => ({
      order: () => Promise.resolve({ data: [playerRow()], error: null }),
    }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    mockFrom.mockReturnValue({ select: () => ({ eq: eq1 }) });

    const players = await TeamPlayersService.fetchTeamPlayers('team-1');

    expect(mockFrom).toHaveBeenCalledWith('team_players');
    expect(eq1).toHaveBeenCalledWith('team_id', 'team-1');
    expect(eq2).toHaveBeenCalledWith('is_active', true);
    expect(players).toHaveLength(1);
  });

  it('maps a missing table to LiveScoringNotEnabledError', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({ order: () => Promise.resolve({ data: null, error: pgError('42P01') }) }),
        }),
      }),
    });

    await expect(TeamPlayersService.fetchTeamPlayers('team-1')).rejects.toBeInstanceOf(
      LiveScoringNotEnabledError
    );
  });
});

describe('addTeamPlayer', () => {
  it('trims the name and returns the created player', async () => {
    const insert = vi.fn(() => ({
      select: () => ({ single: () => Promise.resolve({ data: playerRow(), error: null }) }),
    }));
    mockFrom.mockReturnValue({ insert });

    const player = await TeamPlayersService.addTeamPlayer('team-1', '  Doug  ');

    expect(insert).toHaveBeenCalledWith({ team_id: 'team-1', display_name: 'Doug' });
    expect(player.display_name).toBe('Doug');
  });

  it('rejects empty names without hitting the database', async () => {
    await expect(TeamPlayersService.addTeamPlayer('team-1', '   ')).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('maps a duplicate name (23505) to a friendly ValidationError', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: pgError('23505') }) }),
      }),
    });

    await expect(TeamPlayersService.addTeamPlayer('team-1', 'Doug')).rejects.toThrow(
      /already on this team/
    );
  });
});
