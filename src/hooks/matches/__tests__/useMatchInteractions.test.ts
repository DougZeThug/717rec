import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseMatchComments, mockUseMatchReactions, mockMembership } = vi.hoisted(() => ({
  mockUseMatchComments: vi.fn(),
  mockUseMatchReactions: vi.fn(),
  mockMembership: { current: null as null | { team: { id: string; name: string } } },
}));

vi.mock('../useMatchComments', () => ({
  useMatchComments: mockUseMatchComments,
}));

vi.mock('../useMatchReactions', () => ({
  useMatchReactions: mockUseMatchReactions,
}));

vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => ({ membership: mockMembership.current }),
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
