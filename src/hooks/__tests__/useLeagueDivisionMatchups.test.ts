import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyDropoutDivisions, DROPOUT_DIVISIONS } from '@/constants/dropoutDivisions';
import { fetchRealDivisionOverrides } from '@/services/divisions/RealDivisionService';
import { fetchLeagueDivisionMatchups } from '@/services/insights/LeagueDivisionMatchupsService';

import { computeDivisionMatchups, useLeagueDivisionMatchups } from '../useLeagueDivisionMatchups';

vi.mock('@/services/insights/LeagueDivisionMatchupsService', () => ({
  fetchLeagueDivisionMatchups: vi.fn(),
}));

vi.mock('@/services/divisions/RealDivisionService', () => ({
  fetchRealDivisionOverrides: vi.fn(),
}));

const tsd = (team_id: string, season_id: string, division_name: string) => ({
  team_id,
  season_id,
  division_name,
});

describe('computeDivisionMatchups', () => {
  it('returns one pairing per pair of different divisions, zeroed, when no matches', () => {
    const result = computeDivisionMatchups({
      matches: [],
      archivedMatches: [],
      teamSeasonDivisions: [],
    });
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  // IN-01: the card used to carry three self-pairing rows, which are symmetric by
  // construction and could only ever read "433–433".
  it('never returns a division paired with itself', () => {
    const result = computeDivisionMatchups({
      matches: [],
      archivedMatches: [],
      teamSeasonDivisions: [],
    });
    expect(result.every((r) => r.tierA !== r.tierB)).toBe(true);
  });

  it('ignores matches played inside one division', () => {
    const result = computeDivisionMatchups({
      matches: [
        { winner_id: 't1', loser_id: 't2', season_id: 's1' },
        { winner_id: 't2', loser_id: 't1', season_id: 's1' },
      ],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('t1', 's1', 'Competitive'), tsd('t2', 's1', 'Competitive')],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('orients cross-tier matchups so the higher tier is side A', () => {
    const result = computeDivisionMatchups({
      matches: [
        { winner_id: 'c1', loser_id: 'i1', season_id: 's1' }, // comp wins
        { winner_id: 'i1', loser_id: 'c1', season_id: 's1' }, // int wins
        { winner_id: 'i1', loser_id: 'c1', season_id: 's1' }, // int wins
      ],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('c1', 's1', 'Competitive'), tsd('i1', 's1', 'Intermediate')],
    });
    const ci = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    expect(ci).toEqual({ tierA: 'competitive', tierB: 'intermediate', winsA: 1, winsB: 2 });
  });

  it('uses historical division for each season independently', () => {
    const result = computeDivisionMatchups({
      // Same two teams: one division apiece in s2, both recreational in s1.
      matches: [{ winner_id: 't1', loser_id: 't2', season_id: 's2' }],
      archivedMatches: [{ winner_id: 't1', loser_id: 't2', season_id: 's1' }],
      teamSeasonDivisions: [
        tsd('t1', 's1', 'Recreational'),
        tsd('t2', 's1', 'Recreational'),
        tsd('t1', 's2', 'Competitive'),
        tsd('t2', 's2', 'Intermediate'),
      ],
    });
    const ci = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    // Only the cross-division season counts; the same-division one is dropped.
    expect(ci).toEqual({ tierA: 'competitive', tierB: 'intermediate', winsA: 1, winsB: 0 });
    expect(result.reduce((sum, r) => sum + r.winsA + r.winsB, 0)).toBe(1);
  });

  it('skips matches where a team has no historical division', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 't1', loser_id: 'missing', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('t1', 's1', 'Competitive')],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('skips hidden divisions', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 't1', loser_id: 't2', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('t1', 's1', 'Hidden'), tsd('t2', 's1', 'Competitive')],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  // A season archived with two Cuspers brackets stores "Cuspers 1"/"Cuspers 2".
  // Those teams still played, so their matches belong on this card.
  it('counts matches against a Cuspers team from a numbered bracket', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 'c1', loser_id: 'k1', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('c1', 's1', 'Competitive'), tsd('k1', 's1', 'Cuspers 1')],
    });

    const row = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    expect(row?.winsA).toBe(1);
    expect(row?.winsB).toBe(0);
  });
});

// A team moved to Hidden after it dropped out. Its games are real games, so the
// league card files them under the real division, where the two sides differ.
describe('computeDivisionMatchups with the real division of a dropped-out team', () => {
  // The 22 games of Doug's 8 team-seasons: each dropped-out team lost every game to a
  // Competitive team of the same season, so each game is one win for that Competitive team.
  const GAMES_BY_TEAM: Record<string, number> = {
    '21f5f389': 1, // Bag Assassins
    '5db6b718': 4, // Shut Your Cornhole
    aa967a4d: 2, // Jerm
    e91cb2d1: 1, // Red Roof Rockets
    accd6e20: 2, // The Tomato Saucers
    fcb5fb21: 4, // Baggin' & Braggin'
    eb7976c7: 6, // Burning Holes & Taking Souls
    '56387477': 2, // Zoo Pals
  };
  const DOUG = Object.entries(DROPOUT_DIVISIONS).map(([key, real]) => {
    const [teamId, seasonId] = key.split('_');
    return { key, teamId, seasonId, real };
  });
  const gameCount = (teamId: string) => GAMES_BY_TEAM[teamId.slice(0, 8)] ?? 0;

  const input = () => ({
    matches: DOUG.flatMap(({ teamId, seasonId }) =>
      Array.from({ length: gameCount(teamId) }, () => ({
        winner_id: `comp-${seasonId}`,
        loser_id: teamId,
        season_id: seasonId,
      }))
    ),
    archivedMatches: [],
    teamSeasonDivisions: [
      ...DOUG.map(({ teamId, seasonId }) => tsd(teamId, seasonId, 'Hidden')),
      ...[...new Set(DOUG.map(({ seasonId }) => seasonId))].map((seasonId) =>
        tsd(`comp-${seasonId}`, seasonId, 'Competitive')
      ),
    ],
  });

  const wins = (result: ReturnType<typeof computeDivisionMatchups>) =>
    Object.fromEntries(result.map((r) => [`${r.tierA}|${r.tierB}`, [r.winsA, r.winsB]]));

  it("leaves today's numbers alone with no overrides: every game against a Hidden team is left out", () => {
    expect(wins(computeDivisionMatchups(input()))).toEqual({
      'competitive|intermediate': [0, 0],
      'competitive|recreational': [0, 0],
      'intermediate|recreational': [0, 0],
    });
    expect(wins(computeDivisionMatchups({ ...input(), realDivisions: new Map() }))).toEqual({
      'competitive|intermediate': [0, 0],
      'competitive|recreational': [0, 0],
      'intermediate|recreational': [0, 0],
    });
  });

  it('counts only the games between different tiers: 3 against Intermediate, 11 against Recreational', () => {
    const result = computeDivisionMatchups({
      ...input(),
      realDivisions: applyDropoutDivisions(new Map()),
    });

    // The 8 games against a Competitive team that dropped out are inside one
    // division, so the card leaves them out, as it does for any same-division game.
    expect(wins(result)).toEqual({
      'competitive|intermediate': [3, 0],
      'competitive|recreational': [11, 0],
      'intermediate|recreational': [0, 0],
    });
  });

  it('never replaces a real stored division with an override', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 'c1', loser_id: 'c2', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('c1', 's1', 'Competitive'), tsd('c2', 's1', 'Competitive')],
      realDivisions: new Map([['c2_s1', 'Recreational']]),
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('files a team-season that has no stats row at all', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 'c1', loser_id: 'gone', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('c1', 's1', 'Competitive')],
      realDivisions: new Map([['gone_s1', 'Intermediate']]),
    });
    const ci = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    expect(ci).toEqual({ tierA: 'competitive', tierB: 'intermediate', winsA: 1, winsB: 0 });
  });

  it('files a team-season with a blank division', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 'c1', loser_id: 't2', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [
        tsd('c1', 's1', 'Competitive'),
        { team_id: 't2', season_id: 's1', division_name: null },
      ],
      realDivisions: new Map([['t2_s1', 'Recreational']]),
    });
    const cr = result.find((r) => r.tierA === 'competitive' && r.tierB === 'recreational');
    expect(cr?.winsA).toBe(1);
  });
});

describe('useLeagueDivisionMatchups', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    vi.mocked(fetchLeagueDivisionMatchups).mockResolvedValue({
      matches: [{ winner_id: 'c1', loser_id: 'gone', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [
        { team_id: 'c1', season_id: 's1', division_name: 'Competitive' },
        { team_id: 'gone', season_id: 's1', division_name: 'Hidden' },
      ],
    });
  });

  it('files the game against the Hidden team under its real division', async () => {
    vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(new Map([['gone_s1', 'Recreational']]));

    const { result } = renderHook(() => useLeagueDivisionMatchups(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cr = result.current.data?.find(
      (r) => r.tierA === 'competitive' && r.tierB === 'recreational'
    );
    expect(cr?.winsA).toBe(1);
    expect(fetchRealDivisionOverrides).toHaveBeenCalledTimes(1);
  });

  it("leaves today's numbers alone when there are no overrides", async () => {
    vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(new Map());

    const { result } = renderHook(() => useLeagueDivisionMatchups(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });
});
