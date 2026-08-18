import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayoffViewState } from '../usePlayoffViewState';
import type { PlayoffPageData } from '../usePlayoffPageData';
import type { usePlayoffHandlers } from '../usePlayoffHandlers';

const mockToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/errorHandler', () => ({
  getUIErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock('@/utils/logger', () => ({
  bracketLog: vi.fn(),
  errorLog: vi.fn(),
}));

describe('usePlayoffViewState', () => {
  const createData = () => ({
    deleteBracket: vi.fn(),
    refetchBrackets: vi.fn(),
  });

  const createHandlers = () => ({
    handleBracketCreatedWithNavigation: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes the dialog and refetches after a successful delete', async () => {
    const data = createData();
    data.deleteBracket.mockResolvedValue(undefined);
    data.refetchBrackets.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePlayoffViewState(data as any, createHandlers() as any));

    act(() => {
      result.current.handleDeleteBracket('bracket-1', 'Spring Playoffs');
    });

    expect(result.current.deletingBracket).toEqual({ id: 'bracket-1', name: 'Spring Playoffs' });

    await act(async () => {
      await result.current.handleConfirmDeleteBracket();
    });

    expect(data.deleteBracket).toHaveBeenCalledWith('bracket-1', 'Spring Playoffs');
    expect(data.refetchBrackets).toHaveBeenCalledTimes(1);
    expect(result.current.deletingBracket).toBeNull();
    expect(result.current.isDeleting).toBe(false);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('shows "Delete failed" toast when deleteBracket fails and keeps the dialog open', async () => {
    const data = createData();
    data.deleteBracket.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => usePlayoffViewState(data as any, createHandlers() as any));

    act(() => {
      result.current.handleDeleteBracket('bracket-1', 'Spring Playoffs');
    });

    await act(async () => {
      await result.current.handleConfirmDeleteBracket();
    });

    expect(data.deleteBracket).toHaveBeenCalledWith('bracket-1', 'Spring Playoffs');
    expect(data.refetchBrackets).not.toHaveBeenCalled();
    expect(result.current.deletingBracket).not.toBeNull();
    expect(result.current.isDeleting).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete failed',
        variant: 'destructive',
      })
    );
  });

  it('closes the dialog and shows a separate warning toast when delete succeeds but refetch fails', async () => {
    const data = createData();
    data.deleteBracket.mockResolvedValue(undefined);
    data.refetchBrackets.mockRejectedValue(new Error('Refetch failed'));

    const { result } = renderHook(() => usePlayoffViewState(data as any, createHandlers() as any));

    act(() => {
      result.current.handleDeleteBracket('bracket-1', 'Spring Playoffs');
    });

    await act(async () => {
      await result.current.handleConfirmDeleteBracket();
    });

    expect(data.deleteBracket).toHaveBeenCalledWith('bracket-1', 'Spring Playoffs');
    expect(data.refetchBrackets).toHaveBeenCalledTimes(1);
    expect(result.current.deletingBracket).toBeNull();
    expect(result.current.isDeleting).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bracket deleted',
        variant: 'default',
      })
    );
    const toastCall = mockToast.mock.calls[0][0];
    expect(toastCall.description).toContain('Deleted, but list could not refresh');
  });
});
