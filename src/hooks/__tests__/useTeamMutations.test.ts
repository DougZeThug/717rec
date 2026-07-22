import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

const mockToast = vi.fn();

vi.mock('@/services/TeamService', () => ({
  createTeamApi: vi.fn(),
  updateTeamApi: vi.fn(),
  deleteTeamApi: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

import { createTeamApi, deleteTeamApi, updateTeamApi } from '@/services/TeamService';

import { useTeamMutations } from '../useTeamMutations';

const teamInput = { name: 'Alpha' } as unknown as Omit<Team, 'id' | 'created_at'>;
const savedTeam = { id: 't1', name: 'Alpha' } as unknown as Team;

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  const { result } = renderHook(() => useTeamMutations(), { wrapper });
  return { result, invalidateSpy };
};

describe('useTeamMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteTeam invalidates the teams list and team details caches', async () => {
    vi.mocked(deleteTeamApi).mockResolvedValue(undefined);
    const { result, invalidateSpy } = setup();

    await act(async () => {
      await expect(result.current.deleteTeam('team-9')).resolves.toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['teams'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['team-details', 'team-9'] });
  });

  it('deleteTeam re-throws and does not invalidate on failure', async () => {
    vi.mocked(deleteTeamApi).mockRejectedValue(new Error('boom'));
    const { result, invalidateSpy } = setup();

    await act(async () => {
      await expect(result.current.deleteTeam('team-9')).rejects.toThrow('boom');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('updateTeam invalidates caches and shows a success toast', async () => {
    vi.mocked(updateTeamApi).mockResolvedValue(savedTeam as never);
    const { result, invalidateSpy } = setup();

    await act(async () => {
      await result.current.updateTeam('t1', teamInput);
    });

    expect(updateTeamApi).toHaveBeenCalledWith('t1', teamInput);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['teams'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['team-details', 't1'] });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Team Updated' }));
  });

  it('updateTeam maps a division error to a friendly message and re-throws', async () => {
    vi.mocked(updateTeamApi).mockRejectedValue(new Error('invalid division_id'));
    const { result, invalidateSpy } = setup();

    await act(async () => {
      await expect(result.current.updateTeam('t1', teamInput)).rejects.toThrow('division_id');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        description: 'Invalid division selected. Please choose a valid division.',
      })
    );
  });

  it('createTeam invalidates the teams list and shows a success toast', async () => {
    vi.mocked(createTeamApi).mockResolvedValue(savedTeam as never);
    const { result, invalidateSpy } = setup();

    await act(async () => {
      await expect(result.current.createTeam(teamInput)).resolves.toEqual(savedTeam);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['teams'] });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Team Created' }));
  });

  it('createTeam shows a destructive toast and re-throws on failure', async () => {
    vi.mocked(createTeamApi).mockRejectedValue(new Error('boom'));
    const { result, invalidateSpy } = setup();

    await act(async () => {
      await expect(result.current.createTeam(teamInput)).rejects.toThrow('boom');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
