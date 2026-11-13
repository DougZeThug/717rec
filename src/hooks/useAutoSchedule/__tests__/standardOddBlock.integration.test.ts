import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team, TimeBlockTeamsMap } from '@/types';
import { validateMatchSchedule } from '@/utils/autoSchedule/validation';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { usePairingOperations } from '../usePairingOperations';

/**
 * What the standard (non-dual) Auto Schedule screen does with a block of teams, start to
 * finish: Generate (the real hook and the real Blossom generator), Apply (the real
 * conversion to matches), and the check Save runs (the real validateMatchSchedule).
 *
 * Only the network, the toast, the saved-state storage and the logger are faked, so the
 * toasts the admin sees are the real ones.
 */

const mockToast = vi.fn();

vi.mock('../storage', () => ({
  loadAutoScheduleState: () => null,
  saveAutoScheduleState: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(() => Promise.resolve([])),
  haveTeamsPlayedBefore: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>();
  return {
    ...actual,
    log: vi.fn(),
    errorLog: vi.fn(),
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    scheduleLog: vi.fn(),
  };
});

const night = new Date(2026, 10, 19, 12);

/** `count` teams of one division, named `<prefix>1`, `<prefix>2` and so on. */
const makeTeams = (prefix: string, count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({ id: `${prefix}${index + 1}`, name: `${prefix}${index + 1}` })
  );

/** Generate, then apply what was generated, then run the check Save runs. */
const generateApplyAndValidate = async (timeBlockTeams: TimeBlockTeamsMap) => {
  const { result } = renderHook(() => usePairingOperations(vi.fn()));

  await act(async () => {
    await result.current.handleGenerateClick(
      night,
      timeBlockTeams,
      night,
      true,
      false,
      false,
      vi.fn()
    );
  });

  const matches = result.current.handleApplySchedule(
    result.current.generatedPairings,
    night,
    false,
    vi.fn(),
    vi.fn()
  );
  const validation = matches
    ? await validateMatchSchedule(matches, () => Promise.resolve(false))
    : null;

  return { result, matches, validation };
};

describe('standard mode: Generate, Apply and the Save check for one block', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it('applies a block of 4 teams and the Save check accepts it', async () => {
    const { result, matches, validation } = await generateApplyAndValidate({
      Early: makeTeams('A', 4),
    });

    // Every team plays twice, one match in each of the block's two slots.
    expect(Object.keys(result.current.generatedPairings)).toEqual(['Early']);
    expect(matches?.map((match) => match.timeslot)).toEqual([
      '6:30 PM',
      '6:30 PM',
      '7:00 PM',
      '7:00 PM',
    ]);
    expect(validation?.isValid).toBe(true);
    expect(validation?.errors).toEqual([]);
  });

  it.each([3, 7, 9])(
    "generates and applies %i teams, then the Save check refuses the night as a double booking (today's behaviour)",
    async (count) => {
      const { result, matches, validation } = await generateApplyAndValidate({
        Early: makeTeams('A', count),
      });

      // Generate and Apply raise no complaint: the admin only learns at Save.
      expect(result.current.generatedPairings.Early).toHaveLength(count);
      expect(matches).toHaveLength(count);
      expect(validation?.isValid).toBe(false);
      expect(validation?.errors.length).toBeGreaterThan(0);
      expect(validation?.errors.every((error) => error.type === 'duplicate-team')).toBe(true);
      expect(validation?.errors[0]?.message).toBe(
        'Team is scheduled for multiple matches at 6:30 PM'
      );
    }
  );

  it("fails at Generate for 5 teams of one division with only a vague message (today's behaviour)", async () => {
    const { result, matches } = await generateApplyAndValidate({ Early: makeTeams('A', 5) });

    // Nothing was generated, so there is nothing to apply.
    expect(result.current.generatedPairings).toEqual({});
    expect(matches).toBeNull();
    // The reason is a plain error, so the toast keeps only the generic text, and the
    // screen adds its own "Generation Failed" toast on top.
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Failed to generate match pairings. Please try again.',
        variant: 'destructive',
      })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Generation Failed', variant: 'destructive' })
    );
  });
});
