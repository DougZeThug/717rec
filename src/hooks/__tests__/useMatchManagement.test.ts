import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMatchManagement } from '../useMatchManagement';
import type { Match } from '@/types';

const mockHandleCreateMatch = vi.fn();
const mockSetIsFormOpen = vi.fn();
const mockHandleUpdateMatch = vi.fn();
const mockHandleDeleteMatch = vi.fn();
const mockSetEditingMatch = vi.fn();
const mockSetDeleteMatchId = vi.fn();

vi.mock('@/hooks/useMatchCreation', () => ({
  useMatchCreation: vi.fn(() => ({
    isFormOpen: false,
    setIsFormOpen: mockSetIsFormOpen,
    handleCreateMatch: mockHandleCreateMatch,
    isCreating: false,
  })),
}));

vi.mock('@/hooks/useMatchUpdates', () => ({
  useMatchUpdates: vi.fn(() => ({
    editingMatch: null,
    deleteMatchId: null,
    isDeleting: false,
    isUpdating: false,
    setEditingMatch: mockSetEditingMatch,
    setDeleteMatchId: mockSetDeleteMatchId,
    handleUpdateMatch: mockHandleUpdateMatch,
    handleDeleteMatch: mockHandleDeleteMatch,
  })),
}));

import { useMatchCreation } from '@/hooks/useMatchCreation';
import { useMatchUpdates } from '@/hooks/useMatchUpdates';

const makeMatch = (id: string) =>
  ({
    id,
    team1Id: 'team-a',
    team2Id: 'team-b',
    iscompleted: false,
  }) as unknown as Match;

describe('useMatchManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes matches from initialMatches prop', () => {
    const initial = [makeMatch('m-1'), makeMatch('m-2')];
    const { result } = renderHook(() => useMatchManagement(initial));
    expect(result.current.matches).toEqual(initial);
  });

  it('updates matches when initialMatches prop changes', () => {
    const initial = [makeMatch('m-1')];
    const { result, rerender } = renderHook(
      ({ matches }) => useMatchManagement(matches),
      { initialProps: { matches: initial } }
    );
    expect(result.current.matches).toHaveLength(1);

    const updated = [makeMatch('m-1'), makeMatch('m-2')];
    rerender({ matches: updated });
    expect(result.current.matches).toHaveLength(2);
  });

  it('forwards all sub-hook return values', () => {
    (useMatchCreation as ReturnType<typeof vi.fn>).mockReturnValue({
      isFormOpen: true,
      setIsFormOpen: mockSetIsFormOpen,
      handleCreateMatch: mockHandleCreateMatch,
      isCreating: true,
    });
    (useMatchUpdates as ReturnType<typeof vi.fn>).mockReturnValue({
      editingMatch: makeMatch('editing'),
      deleteMatchId: 'del-id',
      isDeleting: true,
      isUpdating: true,
      setEditingMatch: mockSetEditingMatch,
      setDeleteMatchId: mockSetDeleteMatchId,
      handleUpdateMatch: mockHandleUpdateMatch,
      handleDeleteMatch: mockHandleDeleteMatch,
    });

    const { result } = renderHook(() => useMatchManagement([]));
    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.isCreating).toBe(true);
    expect(result.current.editingMatch).not.toBeNull();
    expect(result.current.deleteMatchId).toBe('del-id');
    expect(result.current.isDeleting).toBe(true);
    expect(result.current.isUpdating).toBe(true);
  });

  it('exposes the setIsFormOpen function from sub-hook', () => {
    const { result } = renderHook(() => useMatchManagement([]));
    act(() => { result.current.setIsFormOpen(true); });
    expect(mockSetIsFormOpen).toHaveBeenCalledWith(true);
  });

  it('exposes handleCreateMatch from sub-hook', async () => {
    const { result } = renderHook(() => useMatchManagement([]));
    await act(async () => { await result.current.handleCreateMatch({} as unknown as Omit<Match, 'id'>, []); });
    expect(mockHandleCreateMatch).toHaveBeenCalled();
  });
});
