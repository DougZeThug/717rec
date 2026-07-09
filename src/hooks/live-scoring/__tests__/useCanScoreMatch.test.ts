import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAdminAccess = vi.fn();
const mockUseTeamMembership = vi.fn();

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => mockUseAdminAccess(),
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));

import { useCanScoreMatch } from '../useCanScoreMatch';

const openMatch = { team1_id: 'team-1', team2_id: 'team-2', iscompleted: false };

const setAuthState = ({
  isAdmin = false,
  membership = null as null | { team_id: string; is_approved: boolean },
}) => {
  mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: isAdmin, isLoading: false });
  mockUseTeamMembership.mockReturnValue({ membership, isFetching: false });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCanScoreMatch', () => {
  it('admin can score any open match', () => {
    setAuthState({ isAdmin: true });
    const { result } = renderHook(() => useCanScoreMatch(openMatch));
    expect(result.current.canScore).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it('approved member of team 1 can score', () => {
    setAuthState({ membership: { team_id: 'team-1', is_approved: true } });
    const { result } = renderHook(() => useCanScoreMatch(openMatch));
    expect(result.current.canScore).toBe(true);
    expect(result.current.isMemberOfMatch).toBe(true);
  });

  it('approved member of team 2 can score', () => {
    setAuthState({ membership: { team_id: 'team-2', is_approved: true } });
    const { result } = renderHook(() => useCanScoreMatch(openMatch));
    expect(result.current.canScore).toBe(true);
  });

  it('member of an unrelated team cannot score', () => {
    setAuthState({ membership: { team_id: 'team-99', is_approved: true } });
    const { result } = renderHook(() => useCanScoreMatch(openMatch));
    expect(result.current.canScore).toBe(false);
    expect(result.current.isMemberOfMatch).toBe(false);
  });

  it('unapproved member cannot score', () => {
    setAuthState({ membership: { team_id: 'team-1', is_approved: false } });
    const { result } = renderHook(() => useCanScoreMatch(openMatch));
    expect(result.current.canScore).toBe(false);
  });

  it('anonymous user cannot score', () => {
    setAuthState({});
    const { result } = renderHook(() => useCanScoreMatch(openMatch));
    expect(result.current.canScore).toBe(false);
  });

  it('nobody can score a completed match (admins get reopen instead)', () => {
    setAuthState({ isAdmin: true });
    const { result } = renderHook(() => useCanScoreMatch({ ...openMatch, iscompleted: true }));
    expect(result.current.canScore).toBe(false);
    expect(result.current.isAdmin).toBe(true);
  });

  it('handles a missing match', () => {
    setAuthState({ isAdmin: true });
    const { result } = renderHook(() => useCanScoreMatch());
    expect(result.current.canScore).toBe(false);
  });
});
