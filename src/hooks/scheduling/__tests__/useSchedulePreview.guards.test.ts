import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Team, TimeBlockTeamsMap } from '@/types';
import type { TeamPair, TeamPairingMap } from '@/types/autoSchedule';
import { createMockTeam, createMockTeamPairing } from '@/utils/test/autoSchedule/testHelpers';

import { useSchedulePreview } from '../useSchedulePreview';

/**
 * Match Creation screen, Generate: the two checks that stop it before it generates anything
 * (no date, no teams loaded) and the rematch sentence in the "Schedule Generated" toast.
 * The pairing generator is a fake that returns the pairings each test hands it, so a
 * rematch can be set up directly. The team loader, the toast and the logger are faked too.
 */

const mockToast = vi.fn();
const mockGenerateMatchPairings = vi.hoisted(() => vi.fn());
const mockGetAllBackToBackTeams = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/scheduling/usePairingGenerator', () => ({
  usePairingGenerator: () => ({
    isGenerating: false,
    generatedPairings: {},
    unmatchedTeamIds: [],
    generateMatchPairings: mockGenerateMatchPairings,
  }),
}));

vi.mock('@/services/timeslots/teamLoaderUtils', () => ({
  getAllBackToBackTeams: mockGetAllBackToBackTeams,
  getTeamsByBackToBackPair: vi.fn(),
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

/** `count` teams named `<prefix>1`, `<prefix>2` and so on. */
const makeTeams = (prefix: string, count: number): Team[] =>
  Array.from({ length: count }, (_, index) =>
    createMockTeam({ id: `${prefix}${index + 1}`, name: `${prefix}${index + 1}` })
  );

/** Four pairings in one block. The first `rematches` of them have played before. */
const pairingsWithRematches = (rematches: number): TeamPairingMap => {
  const teams = makeTeams('A', 8);
  const pairs: TeamPair[] = [0, 1, 2, 3].map((index) =>
    createMockTeamPairing({
      team1: teams[index * 2],
      team2: teams[index * 2 + 1],
      hasPlayedBefore: index < rematches,
    })
  );
  return { Early: pairs };
};

/** What the Match Creation screen does: press Preview (loads the teams), then Generate. */
const previewThenGenerate = async (blocks: TimeBlockTeamsMap) => {
  mockGetAllBackToBackTeams.mockResolvedValue(blocks);
  const { result } = renderHook(() => useSchedulePreview());

  await act(async () => {
    await result.current.previewSchedule(night);
  });
  mockToast.mockClear();

  const outcomes: Array<TeamPairingMap | null> = [];
  await act(async () => {
    outcomes.push(await result.current.handleGenerateSchedule(night));
  });

  return { result, generated: outcomes[0] ?? null };
};

describe('Match Creation screen: Generate stops before it generates', () => {
  it('asks for a date when there is none, and does not generate', async () => {
    const { result } = renderHook(() => useSchedulePreview());
    const outcomes: Array<TeamPairingMap | null> = [];

    await act(async () => {
      outcomes.push(await result.current.handleGenerateSchedule(null as unknown as Date));
    });

    expect(outcomes).toEqual([null]);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Select Date',
      description: 'Please select a date first.',
      variant: 'destructive',
    });
    expect(mockGenerateMatchPairings).not.toHaveBeenCalled();
  });

  it('asks to preview first when no teams are loaded, and does not generate', async () => {
    const { result } = renderHook(() => useSchedulePreview());
    const outcomes: Array<TeamPairingMap | null> = [];

    await act(async () => {
      outcomes.push(await result.current.handleGenerateSchedule(night));
    });

    expect(outcomes).toEqual([null]);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'No Teams Loaded',
      description: 'Please preview the schedule first to load teams.',
      variant: 'destructive',
    });
    expect(mockGenerateMatchPairings).not.toHaveBeenCalled();
    expect(result.current.autoScheduleStep).toBe('teams');
  });
});

describe('Match Creation screen: the rematch sentence in the Generate toast', () => {
  it.each([1, 2])('counts %i rematch(es) out of 4 pairings in the toast', async (rematches) => {
    mockGenerateMatchPairings.mockResolvedValue({
      pairings: pairingsWithRematches(rematches),
      unmatchedTeamIds: [],
    });

    const { result, generated } = await previewThenGenerate({ Early: makeTeams('A', 8) });

    expect(generated?.Early).toHaveLength(4);
    expect(result.current.autoScheduleStep).toBe('pairings');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Schedule Generated',
      description: `4 match pairings generated based on team compatibility. ${rematches} pairings are rematches.`,
    });
  });

  it('keeps the rematch sentence after the unmatched-team sentence', async () => {
    mockGenerateMatchPairings.mockResolvedValue({
      pairings: pairingsWithRematches(1),
      unmatchedTeamIds: ['L1'],
    });

    await previewThenGenerate({ Early: makeTeams('A', 8) });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Schedule Generated',
      description:
        '4 match pairings generated based on team compatibility. 1 team was left unmatched. A team alone in its time block has nobody to play. 1 pairings are rematches.',
    });
  });

  it('does not mention rematches when no pairing has played before', async () => {
    mockGenerateMatchPairings.mockResolvedValue({
      pairings: pairingsWithRematches(0),
      unmatchedTeamIds: [],
    });

    await previewThenGenerate({ Early: makeTeams('A', 8) });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Schedule Generated',
      description: '4 match pairings generated based on team compatibility.',
    });
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('rematches') })
    );
  });
});
