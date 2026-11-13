import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team, TimeBlockTeamsMap } from '@/types';
import type { TeamPairingMap } from '@/types/autoSchedule';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { useSchedulePreview } from '../useSchedulePreview';

/**
 * The embedded Match Creation screen: Preview, then Generate. It always runs the standard
 * scheduler (it has no Dual Match Mode switch). The hooks and the Blossom generator are the
 * real ones. Only the team loader, the history lookup, the toast and the logger are faked,
 * so the toasts the admin sees are the real ones.
 */

const mockToast = vi.fn();
const mockGetAllBackToBackTeams = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/services/timeslots/teamLoaderUtils', () => ({
  getAllBackToBackTeams: mockGetAllBackToBackTeams,
  getTeamsByBackToBackPair: vi.fn(),
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

/** Press Preview (loads the teams), then Generate, the way the admin does. */
const previewThenGenerate = async (blocks: TimeBlockTeamsMap) => {
  mockGetAllBackToBackTeams.mockResolvedValue(blocks);
  const { result } = renderHook(() => useSchedulePreview());

  await act(async () => {
    await result.current.previewSchedule(night);
  });
  mockToast.mockClear();

  const outcomes: Array<TeamPairingMap | null> = [];
  await act(async () => {
    outcomes.push(await result.current.handleGenerateSchedule(night, { avoidRematches: true }));
  });

  return { result, generated: outcomes[0] ?? null };
};

describe('Match Creation screen: Generate with the standard scheduler', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it('generates an even block and says how many pairings it made', async () => {
    const { result, generated } = await previewThenGenerate({ Early: makeTeams('A', 4) });

    expect(generated?.Early).toHaveLength(4);
    expect(result.current.autoScheduleStep).toBe('pairings');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Schedule Generated',
      description: '4 match pairings generated based on team compatibility.',
    });
  });

  it('says a team alone in its block was left unmatched, in the singular', async () => {
    await previewThenGenerate({ Early: makeTeams('A', 4), Mid: makeTeams('L', 1) });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Schedule Generated',
      description:
        '4 match pairings generated based on team compatibility. ' +
        '1 team was left unmatched. A team alone in its time block has nobody to play.',
    });
    // The old wording blamed odd numbers.
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('odd numbers') })
    );
  });

  it('says several teams alone in their blocks were left unmatched, in the plural', async () => {
    await previewThenGenerate({
      Early: makeTeams('A', 4),
      Mid: makeTeams('L', 1),
      Late: makeTeams('M', 1),
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Schedule Generated',
      description:
        '4 match pairings generated based on team compatibility. ' +
        '2 teams were left unmatched. A team alone in its time block has nobody to play.',
    });
  });

  it.each([3, 5])(
    'stops for a block of %i teams, shows the reason and stays on the team step',
    async (count) => {
      const { result, generated } = await previewThenGenerate({ Early: makeTeams('A', count) });

      expect(generated).toBeNull();
      expect(result.current.generatedPairings).toEqual({});
      expect(result.current.autoScheduleStep).toBe('teams');
      // The generator's own toast carries the reason: this screen has no Dual toggle, and
      // the message still reads right ("on the Auto Schedule screen").
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description:
            'Failed to generate match pairings: ' +
            `Block Early Pair (6:30-7:00 PM) has ${count} teams. ` +
            'Standard mode needs an even number of teams in a block. ' +
            'Move a team, or use Dual Match Mode on the Auto Schedule screen.',
          variant: 'destructive',
        })
      );
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Schedule Generated' })
      );
    }
  );
});
