import { renderHook } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

import { useMyNextMatch } from '../useMyNextMatch';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: vi.fn(),
}));

vi.mock('@/hooks/useTeamMatches', () => ({
  useTeamMatches: vi.fn(),
}));

import { useAuth } from '@/contexts/auth-context';
import { useTeamMatches } from '@/hooks/useTeamMatches';
import { useTeamMembership } from '@/hooks/useTeamMembership';

const mockUser = { id: 'user-1', email: 'user@example.com' };

const mockMembership = {
  team_id: 'team-1',
  is_approved: true,
  team: { name: 'Alpha', logoUrl: null, imageUrl: null },
};

const makeMatch = (id: string, date: string, completed = false) =>
  ({
    id,
    team1Id: 'team-1',
    team2Id: 'team-2',
    date,
    iscompleted: completed,
    round_number: 1,
    team1Details: null,
    team2Details: { name: 'Beta', image_url: null, logo_url: null },
  }) as unknown as Match;

describe('useMyNextMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser });
    (useTeamMembership as ReturnType<typeof vi.fn>).mockReturnValue({
      membership: mockMembership,
      isLoading: false,
    });
    (useTeamMatches as ReturnType<typeof vi.fn>).mockReturnValue({
      upcomingMatches: [],
      pastMatches: [],
      isLoadingMatches: false,
    });
  });

  it('returns isLoading=false and no membership when no user', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
    const { result } = renderHook(() => useMyNextMatch());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasTeamMembership).toBe(false);
    expect(result.current.matches).toEqual([]);
  });

  it('returns isLoading=true while membership is loading', () => {
    (useTeamMembership as ReturnType<typeof vi.fn>).mockReturnValue({
      membership: null,
      isLoading: true,
    });
    const { result } = renderHook(() => useMyNextMatch());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns hasTeamMembership=false when membership is unapproved', () => {
    (useTeamMembership as ReturnType<typeof vi.fn>).mockReturnValue({
      membership: { ...mockMembership, is_approved: false },
      isLoading: false,
    });
    const { result } = renderHook(() => useMyNextMatch());
    expect(result.current.hasTeamMembership).toBe(false);
  });

  it('returns upcoming matches with opponent details and isPreviousMatches=false', () => {
    (useTeamMatches as ReturnType<typeof vi.fn>).mockReturnValue({
      upcomingMatches: [makeMatch('m-1', '2026-05-01T18:00:00Z')],
      pastMatches: [],
      isLoadingMatches: false,
    });
    const { result } = renderHook(() => useMyNextMatch());
    expect(result.current.isPreviousMatches).toBe(false);
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].opponent.name).toBe('Beta');
    expect(result.current.hasTeamMembership).toBe(true);
  });

  it('returns all matches on same earliest date', () => {
    (useTeamMatches as ReturnType<typeof vi.fn>).mockReturnValue({
      upcomingMatches: [
        makeMatch('m-1', '2026-05-01T18:00:00Z'),
        makeMatch('m-2', '2026-05-01T20:00:00Z'),
        makeMatch('m-3', '2026-05-08T18:00:00Z'),
      ],
      pastMatches: [],
      isLoadingMatches: false,
    });
    const { result } = renderHook(() => useMyNextMatch());
    expect(result.current.matches).toHaveLength(2); // only May 1 matches
  });

  it('falls back to past matches with isPreviousMatches=true when no upcoming', () => {
    (useTeamMatches as ReturnType<typeof vi.fn>).mockReturnValue({
      upcomingMatches: [],
      pastMatches: [
        makeMatch('m-old', '2026-03-15T18:00:00Z', true),
        makeMatch('m-recent', '2026-04-10T18:00:00Z', true),
      ],
      isLoadingMatches: false,
    });
    const { result } = renderHook(() => useMyNextMatch());
    expect(result.current.isPreviousMatches).toBe(true);
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].match.id).toBe('m-recent');
  });

  it('returns empty matches when no upcoming or past matches', () => {
    const { result } = renderHook(() => useMyNextMatch());
    expect(result.current.matches).toEqual([]);
    expect(result.current.hasTeamMembership).toBe(true);
  });

  // Matches are stored as UTC timestamps. In a timezone behind UTC, a late
  // evening game lands on the *next* UTC day, so grouping must use local dates.
  describe('grouping across a UTC day boundary (America/New_York)', () => {
    const originalTz = process.env.TZ;

    beforeAll(() => {
      process.env.TZ = 'America/New_York';
    });

    afterAll(() => {
      process.env.TZ = originalTz;
    });

    // Both on Wed Jul 15 local: 7:00 PM EDT and 10:00 PM EDT.
    const earlyEvening = '2026-07-15T23:00:00.000Z';
    const lateEvening = '2026-07-16T02:00:00.000Z';

    it('keeps both upcoming matches from the same local evening', () => {
      (useTeamMatches as ReturnType<typeof vi.fn>).mockReturnValue({
        upcomingMatches: [makeMatch('m-7pm', earlyEvening), makeMatch('m-10pm', lateEvening)],
        pastMatches: [],
        isLoadingMatches: false,
      });

      const { result } = renderHook(() => useMyNextMatch());

      expect(result.current.matches.map((m) => m.match.id)).toEqual(['m-7pm', 'm-10pm']);
    });

    it('keeps both past matches from the same local evening', () => {
      (useTeamMatches as ReturnType<typeof vi.fn>).mockReturnValue({
        upcomingMatches: [],
        pastMatches: [
          makeMatch('m-7pm', earlyEvening, true),
          makeMatch('m-10pm', lateEvening, true),
        ],
        isLoadingMatches: false,
      });

      const { result } = renderHook(() => useMyNextMatch());

      expect(result.current.isPreviousMatches).toBe(true);
      expect(result.current.matches.map((m) => m.match.id)).toEqual(['m-7pm', 'm-10pm']);
    });

    it('still separates matches on different local days', () => {
      (useTeamMatches as ReturnType<typeof vi.fn>).mockReturnValue({
        upcomingMatches: [
          makeMatch('m-10pm', lateEvening),
          // 7:00 PM EDT the next local day (Thu Jul 16)
          makeMatch('m-next-day', '2026-07-16T23:00:00.000Z'),
        ],
        pastMatches: [],
        isLoadingMatches: false,
      });

      const { result } = renderHook(() => useMyNextMatch());

      expect(result.current.matches.map((m) => m.match.id)).toEqual(['m-10pm']);
    });
  });
});
