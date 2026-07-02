import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTeamsForMatch } from '../utils/teamDataUtils';

const { mockFetchTeamsByIds } = vi.hoisted(() => ({
  mockFetchTeamsByIds: vi.fn(),
}));

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchTeamsByIds: mockFetchTeamsByIds,
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  teamLog: vi.fn(),
}));

type RawTeam = Record<string, unknown>;

const makeRawTeam = (overrides: RawTeam = {}): RawTeam => ({
  team_id: 'team-1',
  name: 'Aces',
  image_url: 'image.png',
  logo_url: 'logo.png',
  players: ['p1', 'p2'],
  wins: 5,
  losses: 2,
  game_wins: 11,
  game_losses: 6,
  created_at: '2026-01-01T00:00:00Z',
  division_id: 'div-1',
  divisionname: 'East',
  sos: 0.61,
  power_score: 12.5,
  win_percentage: 0.714,
  game_win_percentage: 0.647,
  ...overrides,
});

describe('fetchTeamsForMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array without calling the service when no ids are given', async () => {
    await expect(fetchTeamsForMatch([])).resolves.toEqual([]);
    expect(mockFetchTeamsByIds).not.toHaveBeenCalled();
  });

  it('returns an empty array when the service finds no teams', async () => {
    mockFetchTeamsByIds.mockResolvedValue([]);
    await expect(fetchTeamsForMatch(['team-1'])).resolves.toEqual([]);

    mockFetchTeamsByIds.mockResolvedValue(null);
    await expect(fetchTeamsForMatch(['team-1'])).resolves.toEqual([]);
  });

  it('maps raw rows into app Team objects', async () => {
    mockFetchTeamsByIds.mockResolvedValue([makeRawTeam()]);

    const teams = await fetchTeamsForMatch(['team-1']);

    expect(mockFetchTeamsByIds).toHaveBeenCalledWith(['team-1']);
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({
      id: 'team-1',
      name: 'Aces',
      logoUrl: 'image.png', // image_url wins over logo_url
      imageUrl: 'image.png',
      players: ['p1', 'p2'],
      wins: 5,
      losses: 2,
      game_wins: 11,
      game_losses: 6,
      division: 'div-1',
      divisionName: 'East',
      sos: 0.61,
      power_score: 12.5,
      win_percentage: 0.714,
      game_win_percentage: 0.647,
    });
  });

  it('deduplicates rows by team_id, keeping the first occurrence', async () => {
    mockFetchTeamsByIds.mockResolvedValue([
      makeRawTeam({ name: 'First' }),
      makeRawTeam({ name: 'Duplicate' }),
      makeRawTeam({ team_id: 'team-2', name: 'Bravo' }),
    ]);

    const teams = await fetchTeamsForMatch(['team-1', 'team-2']);

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe('First');
    expect(teams[1].name).toBe('Bravo');
  });

  it('skips rows without a team_id', async () => {
    mockFetchTeamsByIds.mockResolvedValue([
      makeRawTeam({ team_id: null }),
      makeRawTeam({ team_id: 'team-2', name: 'Bravo' }),
    ]);

    const teams = await fetchTeamsForMatch(['team-2']);

    expect(teams).toHaveLength(1);
    expect(teams[0].id).toBe('team-2');
  });

  it('applies safe fallbacks for missing or malformed fields', async () => {
    mockFetchTeamsByIds.mockResolvedValue([
      makeRawTeam({
        name: null,
        image_url: null,
        logo_url: 'logo-only.png',
        players: 'not-an-array',
        wins: null,
        losses: null,
        game_wins: null,
        game_losses: null,
        division_id: null,
        divisionname: null,
        sos: '0.42',
        power_score: '7.25',
        win_percentage: 'bad',
        game_win_percentage: null,
      }),
    ]);

    const [team] = await fetchTeamsForMatch(['team-1']);

    expect(team.name).toBe('Unknown Team');
    expect(team.logoUrl).toBe('logo-only.png'); // falls back to logo_url
    expect(team.imageUrl).toBe('logo-only.png');
    expect(team.players).toEqual([]);
    expect(team.wins).toBe(0);
    expect(team.losses).toBe(0);
    expect(team.game_wins).toBe(0);
    expect(team.game_losses).toBe(0);
    expect(team.division).toBeNull();
    expect(team.divisionName).toBeNull();
    expect(team.sos).toBe(0.42); // string parsed
    expect(team.power_score).toBe(7.25); // string parsed
    expect(team.win_percentage).toBe(0);
    expect(team.game_win_percentage).toBe(0);
  });

  it('defaults sos to 0.5 and power_score to 0 when missing entirely', async () => {
    mockFetchTeamsByIds.mockResolvedValue([makeRawTeam({ sos: null, power_score: null })]);

    const [team] = await fetchTeamsForMatch(['team-1']);

    expect(team.sos).toBe(0.5);
    expect(team.power_score).toBe(0);
  });

  it('rethrows service errors', async () => {
    mockFetchTeamsByIds.mockRejectedValue(new Error('network fail'));

    await expect(fetchTeamsForMatch(['team-1'])).rejects.toThrow('network fail');
  });
});
