import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSchedulePreview } from '@/hooks/scheduling/useSchedulePreview';
import { fetchTeamsByIds } from '@/services/matches/MatchTeamLookupService';
import type { Team, TimeBlockTeamsMap } from '@/types';
import { DatabaseError } from '@/types/errors';
import { ratingRow } from '@/utils/test/autoSchedule/qualityHelpers';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { usePairingOperations } from '../usePairingOperations';

/**
 * Prioritize Match Quality on both auto-schedule screens, from the button to the toast, with the
 * real hooks and the real Blossom generator. Only the network, the toast, the saved-state
 * storage, the team loader and the logger are faked.
 */

const mockToast = vi.fn();
const mockGetAllBackToBackTeams = vi.hoisted(() => vi.fn());

vi.mock('../storage', () => ({
  loadAutoScheduleState: () => null,
  saveAutoScheduleState: vi.fn(),
}));

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

vi.mock('@/services/matches/MatchTeamLookupService', () => ({
  fetchTeamsByIds: vi.fn(),
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

/** What the admin reads when the ratings cannot be loaded. */
const RATINGS_FAILED =
  'Failed to generate match pairings: ' +
  'Could not load the team ratings that Prioritize Match Quality needs. ' +
  'Turn off Prioritize Match Quality and try again.';

const SCREEN_WEIGHTS = {
  powerScoreWeight: 5,
  sosWeight: 3,
  recordWeight: 3.5,
  gameRecordWeight: 2,
};

/** `count` Intermediate teams named `<prefix>1`, `<prefix>2` and so on. */
const makeTeams = (prefix: string, count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({
      id: `${prefix}${index + 1}`,
      name: `${prefix}${index + 1}`,
      divisionName: 'Intermediate',
    })
  );

/** Press Generate on the Auto Schedule screen. */
const generateOnAutoSchedule = async (
  blocks: TimeBlockTeamsMap,
  { prioritizeQuality, dualMatchMode }: { prioritizeQuality: boolean; dualMatchMode: boolean }
) => {
  const { result } = renderHook(() => usePairingOperations(vi.fn()));

  await act(async () => {
    await result.current.handleGenerateClick(
      night,
      blocks,
      night,
      true,
      prioritizeQuality,
      dualMatchMode,
      vi.fn()
    );
  });

  return result;
};

describe('Prioritize Match Quality, from the button to the toast', () => {
  beforeEach(() => {
    mockToast.mockClear();
    vi.mocked(fetchTeamsByIds).mockImplementation((ids) =>
      Promise.resolve(ids.map((id) => ratingRow(id)))
    );
  });

  describe('on the Auto Schedule screen', () => {
    it('reads the ratings once and generates the block when the switch is ON', async () => {
      const result = await generateOnAutoSchedule(
        { Early: makeTeams('A', 4) },
        { prioritizeQuality: true, dualMatchMode: false }
      );

      expect(fetchTeamsByIds).toHaveBeenCalledTimes(1);
      expect(fetchTeamsByIds).toHaveBeenCalledWith(['A1', 'A2', 'A3', 'A4']);
      expect(result.current.generatedPairings.Early).toHaveLength(4);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('Schedule Generated') })
      );
    });

    it('shows the reason, and generates nothing, when the ratings cannot be loaded', async () => {
      vi.mocked(fetchTeamsByIds).mockRejectedValue(
        new DatabaseError('Failed to fetch teams by IDs', { code: '57014' })
      );

      const result = await generateOnAutoSchedule(
        { Early: makeTeams('A', 4) },
        { prioritizeQuality: true, dualMatchMode: false }
      );

      expect(result.current.generatedPairings).toEqual({});
      // getUIErrorMessage keeps the message of this error and puts the screen's own lead-in in
      // front of it. A plain database error would have been hidden behind "Please try again".
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: RATINGS_FAILED,
          variant: 'destructive',
        })
      );
      // The screen adds its own generic toast too. Three toasts fit at once, so both show.
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Generation Failed', variant: 'destructive' })
      );
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('Schedule Generated') })
      );
    });

    it('generates without reading any ratings when the switch is OFF, even if the network is down', async () => {
      vi.mocked(fetchTeamsByIds).mockRejectedValue(new DatabaseError('down'));

      const result = await generateOnAutoSchedule(
        { Early: makeTeams('A', 4) },
        { prioritizeQuality: false, dualMatchMode: false }
      );

      expect(fetchTeamsByIds).not.toHaveBeenCalled();
      expect(result.current.generatedPairings.Early).toHaveLength(4);
    });

    it('does not change Dual Match Mode: the ratings are never read when the switch is ON', async () => {
      // A double header: the same 4 teams in both blocks, as the dual scheduler expects.
      const teams = makeTeams('A', 4);

      const result = await generateOnAutoSchedule(
        { Early: teams, Late: teams },
        { prioritizeQuality: true, dualMatchMode: true }
      );

      expect(fetchTeamsByIds).not.toHaveBeenCalled();
      expect(Object.keys(result.current.generatedPairings).length).toBeGreaterThan(0);
    });
  });

  describe('on the Match Creation screen (Generate after Preview)', () => {
    const previewThenGenerate = async (
      blocks: TimeBlockTeamsMap,
      options: { weights?: typeof SCREEN_WEIGHTS }
    ) => {
      mockGetAllBackToBackTeams.mockResolvedValue(blocks);
      const { result } = renderHook(() => useSchedulePreview());

      await act(async () => {
        await result.current.previewSchedule(night);
      });
      mockToast.mockClear();

      await act(async () => {
        await result.current.handleGenerateSchedule(night, { avoidRematches: true, ...options });
      });

      return result;
    };

    it('shows the reason, and stays on the team step, when the ratings cannot be loaded', async () => {
      vi.mocked(fetchTeamsByIds).mockRejectedValue(
        new DatabaseError('Failed to fetch teams by IDs')
      );

      const result = await previewThenGenerate(
        { Early: makeTeams('A', 4) },
        { weights: SCREEN_WEIGHTS }
      );

      expect(result.current.generatedPairings).toEqual({});
      expect(result.current.autoScheduleStep).toBe('teams');
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: RATINGS_FAILED,
          variant: 'destructive',
        })
      );
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Schedule Generated' })
      );
    });

    it('generates the block when the screen sends the four weights and the ratings load', async () => {
      const result = await previewThenGenerate(
        { Early: makeTeams('A', 4) },
        { weights: SCREEN_WEIGHTS }
      );

      expect(fetchTeamsByIds).toHaveBeenCalledWith(['A1', 'A2', 'A3', 'A4']);
      expect(result.current.autoScheduleStep).toBe('pairings');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Schedule Generated',
        description: '4 match pairings generated based on team compatibility.',
      });
    });

    it('reads no ratings when the screen sends no weights', async () => {
      const result = await previewThenGenerate({ Early: makeTeams('A', 4) }, {});

      expect(fetchTeamsByIds).not.toHaveBeenCalled();
      expect(result.current.autoScheduleStep).toBe('pairings');
    });
  });
});
