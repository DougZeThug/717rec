import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const playMock = vi.hoisted(() => vi.fn());
const soundSpy = vi.hoisted(() => vi.fn());

vi.mock('use-sound', () => ({
  default: (...args: unknown[]) => {
    soundSpy(...args);
    return [playMock];
  },
}));

import { useRoundSavedSound } from '../useRoundSavedSound';

const STORAGE_KEY = '717rec:live-scoring-sound';

describe('useRoundSavedSound', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is off by default', () => {
    const { result } = renderHook(() => useRoundSavedSound());

    expect(result.current.soundEnabled).toBe(false);
    expect(soundSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ soundEnabled: false })
    );
  });

  it('reads the saved choice from this device', () => {
    localStorage.setItem(STORAGE_KEY, 'true');

    const { result } = renderHook(() => useRoundSavedSound());

    expect(result.current.soundEnabled).toBe(true);
    expect(soundSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ soundEnabled: true })
    );
  });

  it('falls back to off when the saved value is not true or false', () => {
    localStorage.setItem(STORAGE_KEY, '"loud"');

    const { result } = renderHook(() => useRoundSavedSound());

    expect(result.current.soundEnabled).toBe(false);
  });

  it('saves the choice and previews the sound when turned on', () => {
    const { result } = renderHook(() => useRoundSavedSound());

    act(() => result.current.setSoundEnabled(true));

    expect(result.current.soundEnabled).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    // The state has not reached use-sound yet, so the preview must force it.
    expect(playMock).toHaveBeenCalledWith({ forceSoundEnabled: true });
  });

  it('saves the choice without a sound when turned off', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useRoundSavedSound());

    act(() => result.current.setSoundEnabled(false));

    expect(result.current.soundEnabled).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    expect(playMock).not.toHaveBeenCalled();
  });

  it('hands the play function to the caller', () => {
    const { result } = renderHook(() => useRoundSavedSound());

    expect(result.current.playRoundSaved).toBe(playMock);
  });
});
