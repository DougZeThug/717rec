import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockOrder = vi.fn();
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
import { fetchTeamsFromApi } from '../TeamFetchService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRow = (overrides = {}) => ({
  team_id: 'team-1',
  name: 'Thunder',
  logo_url: null,
  image_url: 'https://img.example.com/thunder.png',
  wins: 5,
  losses: 2,
  game_wins: 10,
  game_losses: 4,
  division_id: 'div-1',
  divisionname: 'Division A',
  sos: 1250,
  power_score: 1300,
  win_percentage: 0.714,
  game_win_percentage: 0.714,
  players: ['Alice', 'Bob'],
  created_at: '2025-01-01T00:00:00Z',
  close_match_losses: 1,
  ...overrides,
});

const setupSuccess = (rows: ReturnType<typeof makeRow>[]) => {
  mockOrder.mockResolvedValue({ data: rows, error: null });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
};

const setupError = (message = 'db error') => {
  mockOrder.mockResolvedValue({
    data: null,
    error: { message, code: '42P01', details: null, hint: null, name: 'PostgrestError' },
  });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fetchTeamsFromApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns transformed teams on success', async () => {
    setupSuccess([makeRow()]);
    const teams = await fetchTeamsFromApi();

    expect(teams).toHaveLength(1);
    expect(teams[0].id).toBe('team-1');
    expect(teams[0].name).toBe('Thunder');
    expect(teams[0].wins).toBe(5);
    expect(teams[0].losses).toBe(2);
    expect(teams[0].power_score).toBe(1300);
  });

  it('returns empty array when no teams exist', async () => {
    setupSuccess([]);
    const teams = await fetchTeamsFromApi();
    expect(teams).toEqual([]);
  });

  it('transforms image_url to logoUrl and imageUrl', async () => {
    setupSuccess([makeRow({ image_url: 'https://example.com/logo.png', logo_url: null })]);
    const teams = await fetchTeamsFromApi();
    expect(teams[0].logoUrl).toBe('https://example.com/logo.png');
    expect(teams[0].imageUrl).toBe('https://example.com/logo.png');
  });

  it('falls back to logo_url when image_url is null', async () => {
    setupSuccess([makeRow({ image_url: null, logo_url: 'https://example.com/logo_fallback.png' })]);
    const teams = await fetchTeamsFromApi();
    expect(teams[0].logoUrl).toBe('https://example.com/logo_fallback.png');
  });

  it('uses default name when name is null', async () => {
    setupSuccess([makeRow({ name: null })]);
    const teams = await fetchTeamsFromApi();
    expect(teams[0].name).toBe('Unnamed Team');
  });

  it('throws DatabaseError on Supabase error', async () => {
    setupError('relation "v_team_details" does not exist');
    await expect(fetchTeamsFromApi()).rejects.toThrow(DatabaseError);
  });

  it('queries the v_team_details view', async () => {
    setupSuccess([]);
    await fetchTeamsFromApi();
    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });

  it('transforms players array correctly', async () => {
    setupSuccess([makeRow({ players: ['Player1', 'Player2', 'Player3'] })]);
    const teams = await fetchTeamsFromApi();
    expect(teams[0].players).toEqual(['Player1', 'Player2', 'Player3']);
  });

  it('defaults players to empty array when players is not an array', async () => {
    setupSuccess([makeRow({ players: null })]);
    const teams = await fetchTeamsFromApi();
    expect(teams[0].players).toEqual([]);
  });

  it('handles null numeric values with defaults', async () => {
    setupSuccess([makeRow({ wins: null, losses: null, game_wins: null, game_losses: null })]);
    const teams = await fetchTeamsFromApi();
    expect(teams[0].wins).toBe(0);
    expect(teams[0].losses).toBe(0);
    expect(teams[0].game_wins).toBe(0);
    expect(teams[0].game_losses).toBe(0);
  });

  it('preserves null for sos and power_score when they are null', async () => {
    setupSuccess([makeRow({ sos: null, power_score: null })]);
    const teams = await fetchTeamsFromApi();
    expect(teams[0].sos).toBeNull();
    expect(teams[0].power_score).toBeNull();
  });
});
