import { describe, expect, it } from 'vitest';

import { TeamRowData, transformTeamRow } from '../teamTransformer';

function makeRow(overrides: Partial<TeamRowData> = {}): TeamRowData {
  return {
    team_id: 'team-abc',
    name: 'The Crushers',
    logo_url: null,
    image_url: null,
    wins: 5,
    losses: 3,
    game_wins: 12,
    game_losses: 8,
    division_id: 'div-1',
    divisionname: 'Competitive',
    sos: 62.5,
    power_score: 71.0,
    win_percentage: 0.625,
    game_win_percentage: 0.6,
    players: [],
    created_at: '2025-01-01T00:00:00Z',
    close_match_losses: 2,
    ...overrides,
  };
}

describe('transformTeamRow', () => {
  it('maps basic fields correctly', () => {
    const team = transformTeamRow(makeRow());
    expect(team.id).toBe('team-abc');
    expect(team.name).toBe('The Crushers');
    expect(team.wins).toBe(5);
    expect(team.losses).toBe(3);
    expect(team.game_wins).toBe(12);
    expect(team.game_losses).toBe(8);
    expect(team.win_percentage).toBe(0.625);
    expect(team.game_win_percentage).toBe(0.6);
    expect(team.close_match_losses).toBe(2);
  });

  it('uses "Unnamed Team" when name is null', () => {
    const team = transformTeamRow(makeRow({ name: null }));
    expect(team.name).toBe('Unnamed Team');
  });

  it('prefers image_url over logo_url for logoUrl and imageUrl', () => {
    const team = transformTeamRow(
      makeRow({ image_url: 'img.webp', logo_url: 'logo.png' })
    );
    expect(team.logoUrl).toBe('img.webp');
    expect(team.imageUrl).toBe('img.webp');
  });

  it('falls back to logo_url when image_url is null', () => {
    const team = transformTeamRow(makeRow({ image_url: null, logo_url: 'logo.png' }));
    expect(team.logoUrl).toBe('logo.png');
  });

  it('preserves numeric sos and power_score', () => {
    const team = transformTeamRow(makeRow({ sos: 55.0, power_score: 70.0 }));
    expect(team.sos).toBe(55.0);
    expect(team.power_score).toBe(70.0);
  });

  it('sets sos and power_score to null when not a number', () => {
    const team = transformTeamRow(makeRow({ sos: null, power_score: null }));
    expect(team.sos).toBeNull();
    expect(team.power_score).toBeNull();
  });

  it('converts non-array players to empty array', () => {
    const team = transformTeamRow(makeRow({ players: null }));
    expect(team.players).toEqual([]);
  });

  it('keeps array players as-is', () => {
    const players = [{ id: 'p1', name: 'Player 1' }];
    const team = transformTeamRow(makeRow({ players }));
    expect(team.players).toEqual(players);
  });

  it('sets division (legacy) equal to division_id', () => {
    const team = transformTeamRow(makeRow({ division_id: 'div-1' }));
    expect(team.division).toBe('div-1');
    expect(team.division_id).toBe('div-1');
  });

  it('sets divisionName from divisionname field', () => {
    const team = transformTeamRow(makeRow({ divisionname: 'Recreational' }));
    expect(team.divisionName).toBe('Recreational');
  });
});
