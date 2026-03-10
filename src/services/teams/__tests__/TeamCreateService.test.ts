import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  teamLog: vi.fn(),
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { createTeamApi } from '../TeamCreateService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTeamInput = (overrides = {}) => ({
  name: 'New Team',
  logoUrl: 'https://img.example.com/logo.png',
  imageUrl: 'https://img.example.com/image.png',
  players: ['Player A', 'Player B'],
  wins: 0,
  losses: 0,
  game_wins: 0,
  game_losses: 0,
  division_id: 'div-1',
  division: 'div-1',
  divisionName: null,
  sos: null,
  power_score: null,
  win_percentage: 0,
  game_win_percentage: 0,
  close_match_losses: null,
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const makeDbRow = (overrides = {}) => ({
  id: 'new-team-id',
  name: 'New Team',
  logo_url: 'https://img.example.com/logo.png',
  image_url: 'https://img.example.com/image.png',
  players: ['Player A', 'Player B'],
  division_id: 'div-1',
  created_at: '2025-01-01T00:00:00Z',
  seed: null,
  ...overrides,
});

const setupSuccess = (row = makeDbRow()) => {
  mockSingle.mockResolvedValue({ data: row, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });
};

const setupError = (message = 'insert failed') => {
  mockSingle.mockResolvedValue({
    data: null,
    error: { message, code: '23505', details: null, hint: null, name: 'PostgrestError' },
  });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockFrom.mockReturnValue({ insert: mockInsert });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('createTeamApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns transformed team on success', async () => {
    setupSuccess();
    const team = await createTeamApi(makeTeamInput());

    expect(team.id).toBe('new-team-id');
    expect(team.name).toBe('New Team');
    expect(team.wins).toBe(0);
    expect(team.losses).toBe(0);
  });

  it('maps image_url to logoUrl and imageUrl in the response', async () => {
    setupSuccess(makeDbRow({ image_url: 'https://example.com/img.png', logo_url: null }));
    const team = await createTeamApi(makeTeamInput());
    expect(team.logoUrl).toBe('https://example.com/img.png');
    expect(team.imageUrl).toBe('https://example.com/img.png');
  });

  it('falls back to logo_url when image_url is null', async () => {
    setupSuccess(makeDbRow({ image_url: null, logo_url: 'https://example.com/fallback.png' }));
    const team = await createTeamApi(makeTeamInput());
    expect(team.logoUrl).toBe('https://example.com/fallback.png');
  });

  it('defaults players to empty array when db returns null', async () => {
    setupSuccess(makeDbRow({ players: null }));
    const team = await createTeamApi(makeTeamInput());
    expect(team.players).toEqual([]);
  });

  it('includes created_at in returned team', async () => {
    setupSuccess();
    const team = await createTeamApi(makeTeamInput());
    expect(team.created_at).toBe('2025-01-01T00:00:00Z');
  });

  it('throws DatabaseError when Supabase returns an error', async () => {
    setupError('duplicate key value');
    await expect(createTeamApi(makeTeamInput())).rejects.toThrow(DatabaseError);
  });

  it('inserts into the teams table', async () => {
    setupSuccess();
    await createTeamApi(makeTeamInput());
    expect(mockFrom).toHaveBeenCalledWith('teams');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('passes correct fields to the insert call', async () => {
    setupSuccess();
    const input = makeTeamInput({ name: 'Rockets', division_id: 'div-2' });
    await createTeamApi(input);

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.name).toBe('Rockets');
    expect(insertArg.division_id).toBe('div-2');
  });

  it('sets division_id to null when not provided', async () => {
    setupSuccess(makeDbRow({ division_id: null }));
    const input = makeTeamInput({ division_id: null });
    await createTeamApi(input);

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.division_id).toBeNull();
  });
});
