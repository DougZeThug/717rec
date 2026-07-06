import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/utils/logger');
  return Object.fromEntries(Object.keys(actual).map((name) => [name, vi.fn()]));
});

import { useMatchEventListeners } from '../useMatchEventListeners';

describe('useMatchEventListeners', () => {
  const updateFiltersForMatchDate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates filters when a matchesCreated event with a date arrives', () => {
    renderHook(() => useMatchEventListeners({ updateFiltersForMatchDate }));

    const date = new Date('2026-06-25T00:00:00.000Z');
    window.dispatchEvent(new CustomEvent('matchesCreated', { detail: { date } }));

    expect(updateFiltersForMatchDate).toHaveBeenCalledTimes(1);
    expect(updateFiltersForMatchDate).toHaveBeenCalledWith(date);
  });

  it('ignores matchesCreated events without a date payload', () => {
    renderHook(() => useMatchEventListeners({ updateFiltersForMatchDate }));

    window.dispatchEvent(new CustomEvent('matchesCreated'));
    window.dispatchEvent(new CustomEvent('matchesCreated', { detail: {} }));

    expect(updateFiltersForMatchDate).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const { unmount } = renderHook(() => useMatchEventListeners({ updateFiltersForMatchDate }));

    unmount();
    window.dispatchEvent(new CustomEvent('matchesCreated', { detail: { date: new Date() } }));

    expect(updateFiltersForMatchDate).not.toHaveBeenCalled();
  });
});
