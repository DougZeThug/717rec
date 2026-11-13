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

  describe('an odd block of 3 or more teams', () => {
    const oddBlockReason = (count: number) =>
      `Block Early Pair (6:30-7:00 PM) has ${count} teams. ` +
      'Standard mode needs an even number of teams in a block. ' +
      'Move a team, or use Dual Match Mode on the Auto Schedule screen.';

    it.each([3, 5, 7, 9])(
      'stops at Generate for %i teams and shows the reason, with nothing to apply or save',
      async (count) => {
        const { result, matches, validation } = await generateApplyAndValidate({
          Early: makeTeams('A', count),
        });

        // Nothing was generated, so there is nothing to apply and nothing for Save to refuse.
        expect(result.current.generatedPairings).toEqual({});
        expect(result.current.unmatchedTeamIds).toEqual([]);
        expect(matches).toBeNull();
        expect(validation).toBeNull();
        // The admin reads the reason in the toast. getUIErrorMessage keeps the message of
        // a ValidationError and puts the screen's own lead-in in front of it.
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            description: `Failed to generate match pairings: ${oddBlockReason(count)}`,
            variant: 'destructive',
          })
        );
        // And the screen adds its own generic toast. Three toasts fit at once, so both show.
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Generation Failed', variant: 'destructive' })
        );
        expect(mockToast).not.toHaveBeenCalledWith(
          expect.objectContaining({ title: expect.stringContaining('Schedule Generated') })
        );
      }
    );

    it('stops the whole night when the odd block sits beside an even block', async () => {
      const { result, matches } = await generateApplyAndValidate({
        Early: makeTeams('A', 4),
        Mid: makeTeams('B', 3),
      });

      expect(result.current.generatedPairings).toEqual({});
      expect(matches).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            'Failed to generate match pairings: ' +
            'Block Mid Pair (7:30-8:00 PM) has 3 teams. ' +
            'Standard mode needs an even number of teams in a block. ' +
            'Move a team, or use Dual Match Mode on the Auto Schedule screen.',
        })
      );
    });
  });
});
