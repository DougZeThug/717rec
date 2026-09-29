import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confettiMock = vi.hoisted(() => vi.fn());

vi.mock('canvas-confetti', () => ({ default: confettiMock }));

import { fireChampionConfetti, fireChampionConfettiOnce } from '../confetti';

const mockReducedMotion = (matches: boolean) => {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches, media: query }) as MediaQueryList
  );
};

describe('confetti', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fireChampionConfetti', () => {
    it('fires one burst with the championship colours', async () => {
      await fireChampionConfetti();

      expect(confettiMock).toHaveBeenCalledTimes(1);
      expect(confettiMock).toHaveBeenCalledWith(
        expect.objectContaining({ colors: expect.arrayContaining(['#f59e0b', '#3b82f6']) })
      );
    });

    it('does nothing when the user prefers reduced motion', async () => {
      mockReducedMotion(true);

      await fireChampionConfetti();

      expect(confettiMock).not.toHaveBeenCalled();
    });

    it('never throws when the confetti library fails', async () => {
      confettiMock.mockImplementationOnce(() => {
        throw new Error('canvas broke');
      });

      await expect(fireChampionConfetti()).resolves.toBeUndefined();
    });
  });

  describe('fireChampionConfettiOnce', () => {
    it('fires only once for the same key in one session', async () => {
      await fireChampionConfettiOnce('team-1');
      await fireChampionConfettiOnce('team-1');

      expect(confettiMock).toHaveBeenCalledTimes(1);
    });

    it('fires again for a different key', async () => {
      await fireChampionConfettiOnce('team-1');
      await fireChampionConfettiOnce('team-2');

      expect(confettiMock).toHaveBeenCalledTimes(2);
    });

    it('still fires when session storage is blocked', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });

      await fireChampionConfettiOnce('team-1');

      expect(confettiMock).toHaveBeenCalledTimes(1);
    });
  });
});
