import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlayoffState } from '../usePlayoffState';

describe('usePlayoffState', () => {
  it('exposes correct initial values', () => {
    const { result } = renderHook(() => usePlayoffState());

    expect(result.current.selectedBracketId).toBeNull();
    expect(result.current.teamDialogOpen).toBe(false);
    expect(result.current.bracketDialogOpen).toBe(false);
    expect(result.current.activeTab).toBe('view');
    expect(result.current.deletingBracket).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it('updates selectedBracketId', () => {
    const { result } = renderHook(() => usePlayoffState());

    act(() => {
      result.current.setSelectedBracketId('b1');
    });

    expect(result.current.selectedBracketId).toBe('b1');
  });

  it('updates teamDialogOpen and bracketDialogOpen', () => {
    const { result } = renderHook(() => usePlayoffState());

    act(() => {
      result.current.setTeamDialogOpen(true);
      result.current.setBracketDialogOpen(true);
    });

    expect(result.current.teamDialogOpen).toBe(true);
    expect(result.current.bracketDialogOpen).toBe(true);
  });

  it('updates activeTab', () => {
    const { result } = renderHook(() => usePlayoffState());

    act(() => {
      result.current.setActiveTab('manage');
    });

    expect(result.current.activeTab).toBe('manage');
  });

  it('sets and clears deletingBracket', () => {
    const { result } = renderHook(() => usePlayoffState());

    act(() => {
      result.current.setDeletingBracket({ id: 'b1', name: 'Main' });
    });

    expect(result.current.deletingBracket).toEqual({ id: 'b1', name: 'Main' });

    act(() => {
      result.current.setDeletingBracket(null);
    });

    expect(result.current.deletingBracket).toBeNull();
  });

  it('updates isDeleting', () => {
    const { result } = renderHook(() => usePlayoffState());

    act(() => {
      result.current.setIsDeleting(true);
    });

    expect(result.current.isDeleting).toBe(true);
  });
});
