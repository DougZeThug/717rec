import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditableTeam, useHistoryEditing } from '../useHistoryEditing';

const team = (
  team_id: string,
  division_name: string,
  playoff_rank: number,
  match_wins = 0
): EditableTeam => ({
  team_id,
  season_id: 'season-1',
  team_name: team_id.toUpperCase(),
  team_logo_url: null,
  team_image_url: null,
  division_name,
  playoff_rank,
  match_wins,
  match_losses: 0,
  game_wins: 0,
  game_losses: 0,
  sos: null,
  power_score: null,
  champion: false,
  runner_up: false,
});

const initialTeams = [
  team('a', 'Competitive', 1),
  team('b', 'Competitive', 2),
  team('c', 'Recreational', 1),
];

afterEach(() => vi.resetAllMocks());

describe('useHistoryEditing', () => {
  it('starts clean and sorts teams by playoff rank', () => {
    const { result } = renderHook(() =>
      useHistoryEditing({ initialTeams: [...initialTeams].reverse(), seasonId: 'season-1' })
    );

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.divisions).toEqual(['Competitive', 'Recreational']);
    expect(result.current.getTeamsByDivision('competitive').map((item) => item.team_id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('reorders teams within a division and reports only changed rows', () => {
    const { result } = renderHook(() => useHistoryEditing({ initialTeams, seasonId: 'season-1' }));

    act(() => result.current.reorderTeamInDivision('Competitive', 0, 1));

    expect(result.current.getTeamsByDivision('Competitive').map((item) => item.team_id)).toEqual([
      'b',
      'a',
    ]);
    expect(result.current.getChanges()).toHaveLength(2);
    expect(result.current.hasChanges).toBe(true);
  });

  it('moves a team and makes ranks consecutive in both divisions', () => {
    const { result } = renderHook(() => useHistoryEditing({ initialTeams, seasonId: 'season-1' }));

    act(() => result.current.moveTeam('b', 'Recreational', 0));

    expect(result.current.getTeamsByDivision('Competitive')).toEqual([
      expect.objectContaining({ team_id: 'a', playoff_rank: 1 }),
    ]);
    expect(result.current.getTeamsByDivision('Recreational')).toEqual([
      expect.objectContaining({ team_id: 'b', playoff_rank: 1 }),
      expect.objectContaining({ team_id: 'c', playoff_rank: 2 }),
    ]);
  });

  it('adds, renames, and removes only empty divisions', () => {
    const { result } = renderHook(() => useHistoryEditing({ initialTeams, seasonId: 'season-1' }));

    act(() => result.current.addDivision('Intermediate'));
    act(() => result.current.addDivision('intermediate'));
    expect(result.current.divisions).toContain('Intermediate');
    expect(result.current.hasChanges).toBe(true);

    act(() => result.current.renameDivision('Intermediate', 'Intermediate 1'));
    expect(result.current.divisions).toContain('Intermediate 1');
    act(() => expect(result.current.removeDivision('Intermediate 1')).toBe(true));
    act(() => expect(result.current.removeDivision('Competitive')).toBe(false));
  });

  it('renames a populated division and reset discards all local changes', () => {
    const { result } = renderHook(() => useHistoryEditing({ initialTeams, seasonId: 'season-1' }));

    act(() => result.current.renameDivision('Competitive', 'Elite'));
    expect(result.current.getTeamsByDivision('Elite')).toHaveLength(2);
    act(() => result.current.resetChanges());
    expect(result.current.getTeamsByDivision('Competitive')).toHaveLength(2);
    expect(result.current.hasChanges).toBe(false);
  });

  it('replaces local edits when fresh source data arrives', () => {
    const { result, rerender } = renderHook(
      ({ teams }) => useHistoryEditing({ initialTeams: teams, seasonId: 'season-1' }),
      { initialProps: { teams: initialTeams } }
    );
    act(() => result.current.moveTeam('a', 'Recreational', 0));

    const refreshed = [team('a', 'Competitive', 2), team('b', 'Competitive', 1)];
    rerender({ teams: refreshed });

    expect(result.current.teams).toEqual(refreshed);
    expect(result.current.hasChanges).toBe(false);
  });
});
