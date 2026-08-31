import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseMatchComments, mockUseMatchReactions, mockMembership } = vi.hoisted(() => ({
  mockUseMatchComments: vi.fn(),
  mockUseMatchReactions: vi.fn(),
  mockMembership: {
    current: null as null | { team: { id: string; name: string }; rejected_at?: string },
  },
}));

vi.mock('../useMatchComments', () => ({
  useMatchComments: mockUseMatchComments,
}));

vi.mock('../useMatchReactions', () => ({
  useMatchReactions: mockUseMatchReactions,
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  // Mirrors the real hook: a refused request is a row, but not a team the
  // person belongs to, so activeMembership drops it.
  useTeamMembership: () => ({
    membership: mockMembership.current,
    activeMembership: mockMembership.current?.rejected_at ? null : mockMembership.current,
  }),
}));

import { useMatchInteractions } from '../useMatchInteractions';

describe('useMatchInteractions', () => {
  const commentsValue = { comments: [], isLoading: false };
  const reactionsValue = { reactions: [], reactionCounts: [], isLoading: false };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMembership.current = null;
    mockUseMatchComments.mockReturnValue(commentsValue);
    mockUseMatchReactions.mockReturnValue(reactionsValue);
  });

  it('passes the match id to both sub-hooks and exposes their results', () => {
    const { result } = renderHook(() => useMatchInteractions('match-1'));

    expect(mockUseMatchComments).toHaveBeenCalledWith('match-1');
    expect(mockUseMatchReactions).toHaveBeenCalledWith('match-1');
    expect(result.current.comments).toBe(commentsValue);
    expect(result.current.reactions).toBe(reactionsValue);
  });

  // B-18: a refused join request keeps its row, so `membership` is truthy for
  // somebody with no team at all. Attributing their comments to the team that
  // just turned them down would be worse than showing none.
  it('exposes no team for a refused join request', () => {
    mockMembership.current = {
      team: { id: 'team-1', name: 'Aces' },
      rejected_at: '2026-08-05T12:00:00.000Z',
    };

    const { result } = renderHook(() => useMatchInteractions('match-1'));

    expect(result.current.currentUserTeam).toBeUndefined();
  });

  it('exposes the current user team from team membership', () => {
    const team = { id: 'team-1', name: 'Aces' };
    mockMembership.current = { team };

    const { result } = renderHook(() => useMatchInteractions('match-1'));

    expect(result.current.currentUserTeam).toBe(team);
  });

  it('returns undefined for currentUserTeam when the user has no membership', () => {
    const { result } = renderHook(() => useMatchInteractions('match-1'));

    expect(result.current.currentUserTeam).toBeUndefined();
  });
});
