import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import { useTeamManagement } from '../useTeamManagement';

const mockUpdateTeam = vi.fn();
const mockDeleteTeam = vi.fn();
const mockFetchTeams = vi.fn();

vi.mock('@/hooks/useTeams', () => ({
  useTeams: vi.fn(() => ({
    teams: [],
    isLoading: false,
    error: null,
    fetchTeams: mockFetchTeams,
    updateTeam: mockUpdateTeam,
    deleteTeam: mockDeleteTeam,
  })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

const makeTeam = (id: string, name: string): Team => ({
  id,
  name,
});

describe('useTeamManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes the edit form after a normal update completes', async () => {
    mockUpdateTeam.mockResolvedValue({ id: 'team-a' });

    const { result } = renderHook(() => useTeamManagement());
    const teamA = makeTeam('team-a', 'Team Alpha');

    act(() => {
      result.current.setTeamToEdit(teamA);
    });
    expect(result.current.teamToEdit?.id).toBe('team-a');

    await act(async () => {
      await result.current.handleUpdateTeam({ name: 'Team Alpha Updated' });
    });

    expect(mockUpdateTeam).toHaveBeenCalledWith('team-a', { name: 'Team Alpha Updated' });
    expect(result.current.teamToEdit).toBeNull();
  });

  it('does not close the wrong form when edit target switches during an update', async () => {
    let resolveUpdateTeamA: (() => void) | undefined;
    const updateTeamAPromise = new Promise<void>((resolve) => {
      resolveUpdateTeamA = resolve;
    });

    mockUpdateTeam.mockImplementation(async (teamId: string) => {
      if (teamId === 'team-a') {
        await updateTeamAPromise;
      }
      return { id: teamId };
    });

    const { result } = renderHook(() => useTeamManagement());
    const teamA = makeTeam('team-a', 'Team Alpha');
    const teamB = makeTeam('team-b', 'Team Beta');

    act(() => {
      result.current.setTeamToEdit(teamA);
    });
    expect(result.current.teamToEdit?.id).toBe('team-a');

    let updatePromise: Promise<void> | undefined;
    act(() => {
      updatePromise = result.current.handleUpdateTeam({ name: 'Team Alpha Updated' });
    });

    act(() => {
      result.current.setTeamToEdit(teamB);
    });
    expect(result.current.teamToEdit?.id).toBe('team-b');

    await act(async () => {
      resolveUpdateTeamA?.();
      await updatePromise;
    });

    expect(result.current.teamToEdit?.id).toBe('team-b');
  });
});
