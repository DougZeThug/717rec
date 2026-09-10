import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Ranking } from '@/types';

import { useProjectedSeeds } from '../useProjectedSeeds';

const mockUseActiveSeason = vi.fn();
const mockUsePlayoffActiveSeason = vi.fn();
const mockUseTeamRankings = vi.fn();

vi.mock('@/hooks/useSeasons', () => ({
  useActiveSeason: () => mockUseActiveSeason(),
  usePlayoffActiveSeason: () => mockUsePlayoffActiveSeason(),
}));

vi.mock('@/hooks/useTeamRankings', () => ({
  useTeamRankings: () => mockUseTeamRankings(),
}));

const ranked = (teamId: string, divisionName: string, powerScore: number | null): Ranking =>
  ({
    teamId,
    teamName: `Team ${teamId}`,
    wins: 0,
    losses: 0,
    winPercentage: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameWinPercentage: 0,
    sos: 0.5,
    powerScore,
    divisionName,
    headToHead: {},
    closeMatchLosses: 0,
  }) satisfies Ranking;

const ACTIVE_SEASON = {
  id: 'season-active',
  name: 'Summer 2 2026',
  is_active: true,
  is_archived: false,
  playoffs_active: false,
  start_date: '2026-06-02',
  end_date: '2026-08-04',
  created_at: '2026-06-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseActiveSeason.mockReturnValue({ data: ACTIVE_SEASON, isLoading: false });
  mockUsePlayoffActiveSeason.mockReturnValue({ data: null, isLoading: false });
  mockUseTeamRankings.mockReturnValue({
    rankings: [ranked('c1', 'Competitive', 90), ranked('c2', 'Competitive', 80)],
    isLoading: false,
    error: null,
  });
});

describe('useProjectedSeeds', () => {
  it('groups the active season into per-division seeds with the closing week', () => {
    const { result } = renderHook(() => useProjectedSeeds('season-active'));

    expect(result.current.isReady).toBe(true);
    expect(result.current.finalWeek).toBe(10);
    expect(result.current.seedsByDivision.Competitive.map((s) => [s.seed, s.teamId])).toEqual([
      [1, 'c1'],
      [2, 'c2'],
    ]);
  });

  it('drops the week number when the season has no end date', () => {
    mockUseActiveSeason.mockReturnValue({
      data: { ...ACTIVE_SEASON, end_date: null },
      isLoading: false,
    });

    const { result } = renderHook(() => useProjectedSeeds('season-active'));

    expect(result.current.isReady).toBe(true);
    expect(result.current.finalWeek).toBeNull();
  });

  it('shows nothing for a season that is not the active one', () => {
    // Power scores carry no season, so seeds for a past season would be wrong.
    const { result } = renderHook(() => useProjectedSeeds('season-2024'));

    expect(result.current.isReady).toBe(false);
    expect(result.current.seedsByDivision).toEqual({});
    expect(result.current.finalWeek).toBeNull();
  });

  it('shows nothing when no season is chosen yet', () => {
    const { result } = renderHook(() => useProjectedSeeds(null));

    expect(result.current.isReady).toBe(false);
    expect(result.current.seedsByDivision).toEqual({});
  });

  it('shows nothing when the league has no live season at all', () => {
    mockUseActiveSeason.mockReturnValue({ data: null, isLoading: false });

    const { result } = renderHook(() => useProjectedSeeds('season-active'));

    expect(result.current.isReady).toBe(false);
    expect(result.current.seedsByDivision).toEqual({});
  });

  it('still seeds once playoffs start and there is no active season', () => {
    // `partial_archive_season` clears is_active and sets playoffs_active in one
    // step, so between it and the first bracket nothing is active — but the
    // standings still describe that season, exactly as
    // `current_standings_season_id()` says.
    mockUseActiveSeason.mockReturnValue({ data: null, isLoading: false });
    mockUsePlayoffActiveSeason.mockReturnValue({
      data: { ...ACTIVE_SEASON, is_active: false, playoffs_active: true },
      isLoading: false,
    });

    const { result } = renderHook(() => useProjectedSeeds('season-active'));

    expect(result.current.isReady).toBe(true);
    expect(result.current.finalWeek).toBe(10);
    expect(result.current.seedsByDivision.Competitive).toHaveLength(2);
  });

  it('prefers the active season over the playoff one, as the database does', () => {
    mockUsePlayoffActiveSeason.mockReturnValue({
      data: { ...ACTIVE_SEASON, id: 'season-old-playoffs' },
      isLoading: false,
    });

    expect(renderHook(() => useProjectedSeeds('season-active')).result.current.isReady).toBe(true);
    expect(renderHook(() => useProjectedSeeds('season-old-playoffs')).result.current.isReady).toBe(
      false
    );
  });

  it('is not ready while either query is loading', () => {
    mockUseTeamRankings.mockReturnValue({ rankings: [], isLoading: true, error: null });
    expect(renderHook(() => useProjectedSeeds('season-active')).result.current.isReady).toBe(false);

    mockUseTeamRankings.mockReturnValue({
      rankings: [ranked('c1', 'Competitive', 90)],
      isLoading: false,
      error: null,
    });
    mockUseActiveSeason.mockReturnValue({ data: ACTIVE_SEASON, isLoading: true });
    expect(renderHook(() => useProjectedSeeds('season-active')).result.current.isReady).toBe(false);

    mockUseActiveSeason.mockReturnValue({ data: ACTIVE_SEASON, isLoading: false });
    mockUsePlayoffActiveSeason.mockReturnValue({ data: null, isLoading: true });
    expect(renderHook(() => useProjectedSeeds('season-active')).result.current.isReady).toBe(false);
  });

  it('falls back quietly when the rankings fail, rather than throwing', () => {
    mockUseTeamRankings.mockReturnValue({
      rankings: [],
      isLoading: false,
      error: new Error('rankings unavailable'),
    });

    const { result } = renderHook(() => useProjectedSeeds('season-active'));

    expect(result.current.isReady).toBe(false);
    expect(result.current.seedsByDivision).toEqual({});
  });
});
