import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecapFactsV1 } from '@/types/recapEdition';

const {
  mockGenerateMutateAsync,
  mockFetchEditionForWeek,
  mockFetchLatestVersion,
  mockSaveMutateAsync,
  mockBlurbsMutateAsync,
} = vi.hoisted(() => ({
  mockGenerateMutateAsync: vi.fn(),
  mockFetchEditionForWeek: vi.fn(),
  mockFetchLatestVersion: vi.fn(),
  mockSaveMutateAsync: vi.fn(),
  mockBlurbsMutateAsync: vi.fn(),
}));

vi.mock('@/hooks/useRecapEditions', () => ({
  useGenerateRecapFacts: () => ({ mutateAsync: mockGenerateMutateAsync, isPending: false }),
  useGenerateCaption: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateBlurbs: () => ({ mutateAsync: mockBlurbsMutateAsync, isPending: false }),
  useSaveRecapVersion: () => ({ mutateAsync: mockSaveMutateAsync, isPending: false }),
  usePublishRecapEdition: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnpublishRecapEdition: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/recapEditions/RecapEditionService', () => ({
  RecapEditionService: {
    fetchEditionForWeek: (...args: unknown[]) => mockFetchEditionForWeek(...args),
    fetchLatestVersion: (...args: unknown[]) => mockFetchLatestVersion(...args),
    ensureEdition: vi.fn(),
  },
}));

vi.mock('@/utils/imageUpload', () => ({ uploadRecapGraphic: vi.fn() }));
vi.mock('@/utils/logger', () => ({ warnLog: vi.fn(), errorLog: vi.fn(), dbLog: vi.fn() }));

import { useWeeklyContentPack } from '../useWeeklyContentPack';

const facts = (
  weekNumber: number,
  winnerName: string,
  teamIds: string[] = ['t-1']
): RecapFactsV1 => ({
  factsSchemaVersion: 1,
  seasonId: 's-1',
  seasonName: 'Fall 2026',
  seasonSlug: 'fall-2026',
  weekNumber,
  weekStartIso: '2026-10-09T04:00:00.000Z',
  weekEndIso: '2026-10-16T04:00:00.000Z',
  upsets: [
    {
      winnerId: 'w',
      winnerName,
      winnerPowerScore: 40,
      loserId: 'l',
      loserName: 'Corn Stars',
      loserPowerScore: 80,
      powerScoreGap: 40,
      winnerProbability: 0.18,
      matchResult: '2–1',
      weekNumber,
    },
  ],
  hotStreaks: [],
  movers: {
    basis: 'compared',
    currentWeek: weekNumber,
    previousWeek: weekNumber - 1,
    risers: [],
    faller: null,
  },
  teamOfTheWeek: null,
  divisions: [],
  powerRankings: teamIds.map((teamId, index) => ({
    rank: index + 1,
    previousRank: index + 2,
    teamId,
    teamName: index === 0 ? winnerName : `Team ${teamId}`,
    logoUrl: null,
    division: 'Competitive',
    grade: 'A' as const,
    gpa: 3.8,
    categories: [],
    wins: 6,
    losses: 2,
    powerScore: 72.4 - index,
    delta: 2.1,
  })),
  unresolvedMatchCount: 0,
  generatedAt: '2026-10-16T12:00:00.000Z',
});

describe('useWeeklyContentPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchEditionForWeek.mockResolvedValue(null);
    mockFetchLatestVersion.mockResolvedValue(null);
  });

  it('fills a fresh draft from the week it generated', async () => {
    mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
    const { result } = renderHook(() => useWeeklyContentPack());

    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });

    expect(result.current.draft.headline).toContain('Bag Chasers');
    expect(result.current.draft.captionSource).toBe('fallback');
  });

  // The bug: generate week 6, then week 7, and week 6's headline stayed on
  // week 7's graphic — publishing a story about the wrong week.
  it('does not carry one week’s text onto another week', async () => {
    mockGenerateMutateAsync.mockResolvedValueOnce(facts(6, 'Bag Chasers'));
    const { result } = renderHook(() => useWeeklyContentPack());

    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });
    act(() => {
      result.current.setField('headline', 'Week six was wild');
    });
    expect(result.current.draft.headline).toBe('Week six was wild');

    mockGenerateMutateAsync.mockResolvedValueOnce(facts(7, 'Toss Bosses'));
    await act(async () => {
      await result.current.generateFor('s-1', 7);
    });

    expect(result.current.draft.headline).not.toBe('Week six was wild');
    expect(result.current.draft.headline).toContain('Toss Bosses');
  });

  it('keeps what was typed when re-generating the same week', async () => {
    mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
    const { result } = renderHook(() => useWeeklyContentPack());

    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });
    act(() => {
      result.current.setField('headline', 'My own words');
      result.current.setField('commissionerNote', 'He beat his brother');
    });

    // Re-generating after a score correction must not discard the writing.
    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });

    expect(result.current.draft.headline).toBe('My own words');
    expect(result.current.draft.commissionerNote).toBe('He beat his brother');
  });

  // The bug: Save draft wrote a version nothing ever read back, so a draft did
  // not survive closing the tab.
  it('restores a draft saved earlier for that week', async () => {
    mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
    mockFetchEditionForWeek.mockResolvedValue({ id: 'e-1', status: 'draft' });
    mockFetchLatestVersion.mockResolvedValue({
      id: 'v-1',
      headline: 'Saved headline',
      caption: 'Saved caption',
      commissioner_note: 'Saved note',
      caption_source: 'ai_edited',
      caption_model: 'claude-opus-5',
    });

    const { result } = renderHook(() => useWeeklyContentPack());

    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });

    expect(result.current.draft.headline).toBe('Saved headline');
    expect(result.current.draft.caption).toBe('Saved caption');
    expect(result.current.draft.commissionerNote).toBe('Saved note');
    expect(result.current.draft.captionSource).toBe('ai_edited');
  });

  it('treats a restored draft as clean, so Save is not offered for nothing', async () => {
    mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
    mockFetchEditionForWeek.mockResolvedValue({ id: 'e-1', status: 'draft' });
    mockFetchLatestVersion.mockResolvedValue({
      id: 'v-1',
      headline: 'Saved headline',
      caption: 'Saved caption',
      commissioner_note: null,
      caption_source: 'manual',
      caption_model: null,
    });

    const { result } = renderHook(() => useWeeklyContentPack());

    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });

    await waitFor(() => expect(result.current.isDirty).toBe(false));
  });

  it('treats a fresh draft as unsaved, because nothing is on file yet', async () => {
    mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
    const { result } = renderHook(() => useWeeklyContentPack());

    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('reports a published edition as a correction', async () => {
    mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
    mockFetchEditionForWeek.mockResolvedValue({ id: 'e-1', status: 'published' });

    const { result } = renderHook(() => useWeeklyContentPack());

    await act(async () => {
      await result.current.generateFor('s-1', 6);
    });

    expect(result.current.isCorrection).toBe(true);
    expect(result.current.publicPath).toBe('/recap/fall-2026/week-6');
  });

  describe('power ranking blurbs', () => {
    it('starts every team off with a line built from the results', async () => {
      mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
      const { result } = renderHook(() => useWeeklyContentPack());

      await act(async () => {
        await result.current.generateFor('s-1', 6);
      });

      expect(result.current.draft.blurbs['t-1']).toContain('Up 1 to 1st');
      expect(result.current.draft.blurbsSource).toBe('fallback');
      expect(result.current.rankings).toHaveLength(1);
    });

    // The same bug the headline already had: switching weeks must not carry
    // twenty-six written lines onto the wrong week's graphic.
    it('does not carry one week’s blurbs onto another week', async () => {
      mockGenerateMutateAsync.mockResolvedValueOnce(facts(6, 'Bag Chasers'));
      const { result } = renderHook(() => useWeeklyContentPack());

      await act(async () => {
        await result.current.generateFor('s-1', 6);
      });
      act(() => {
        result.current.setBlurb('t-1', 'Finally beat their brother.');
      });
      expect(result.current.draft.blurbs['t-1']).toBe('Finally beat their brother.');

      mockGenerateMutateAsync.mockResolvedValueOnce(facts(7, 'Toss Bosses'));
      await act(async () => {
        await result.current.generateFor('s-1', 7);
      });

      expect(result.current.draft.blurbs['t-1']).not.toBe('Finally beat their brother.');
    });

    it('keeps written blurbs, and fills in a team that has just appeared', async () => {
      mockGenerateMutateAsync.mockResolvedValueOnce(facts(6, 'Bag Chasers', ['t-1']));
      const { result } = renderHook(() => useWeeklyContentPack());

      await act(async () => {
        await result.current.generateFor('s-1', 6);
      });
      act(() => {
        result.current.setBlurb('t-1', 'Finally beat their brother.');
      });

      // Re-generating the same week, now with a second team in the rankings —
      // a late score entered for a team that had none before. The typed line
      // must survive, and the newcomer must not be left with a blank line
      // under it on the graphic.
      mockGenerateMutateAsync.mockResolvedValueOnce(facts(6, 'Bag Chasers', ['t-1', 't-2']));
      await act(async () => {
        await result.current.generateFor('s-1', 6);
      });

      expect(result.current.draft.blurbs['t-1']).toBe('Finally beat their brother.');
      expect(result.current.draft.blurbs['t-2']).toBeTruthy();
      expect(result.current.draft.blurbs['t-2']).toContain('on the season');
    });

    it('restores blurbs saved earlier for a week', async () => {
      mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
      mockFetchEditionForWeek.mockResolvedValue({ id: 'e-1', status: 'draft' });
      mockFetchLatestVersion.mockResolvedValue({
        headline: 'Saved headline',
        caption: 'Saved caption',
        caption_source: 'manual',
        caption_model: null,
        commissioner_note: null,
        blurbs: { 't-1': 'Saved line about this team.' },
        blurbs_source: 'ai_edited',
      });

      const { result } = renderHook(() => useWeeklyContentPack());
      await act(async () => {
        await result.current.generateFor('s-1', 6);
      });

      expect(result.current.draft.blurbs['t-1']).toBe('Saved line about this team.');
      expect(result.current.draft.blurbsSource).toBe('ai_edited');
      // A restored draft matches what is on file, so it starts clean.
      expect(result.current.isDirty).toBe(false);
    });

    it('marks an edited AI blurb as edited, so an old edition says so', async () => {
      mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
      mockFetchEditionForWeek.mockResolvedValue({ id: 'e-1', status: 'draft' });
      mockFetchLatestVersion.mockResolvedValue({
        headline: 'h',
        caption: 'c',
        caption_source: 'ai',
        caption_model: 'claude',
        commissioner_note: null,
        blurbs: { 't-1': 'An AI line.' },
        blurbs_source: 'ai',
      });

      const { result } = renderHook(() => useWeeklyContentPack());
      await act(async () => {
        await result.current.generateFor('s-1', 6);
      });
      act(() => {
        result.current.setBlurb('t-1', 'My own words.');
      });

      expect(result.current.draft.blurbsSource).toBe('ai_edited');
      expect(result.current.isDirty).toBe(true);
    });

    it('sends the blurbs when the draft is saved', async () => {
      mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers'));
      mockSaveMutateAsync.mockResolvedValue({ id: 'v-1' });
      const { RecapEditionService } = await import('@/services/recapEditions/RecapEditionService');
      vi.mocked(RecapEditionService.ensureEdition).mockResolvedValue({
        id: 'e-1',
      } as never);

      const { result } = renderHook(() => useWeeklyContentPack());
      await act(async () => {
        await result.current.generateFor('s-1', 6);
      });
      act(() => {
        result.current.setBlurb('t-1', 'One good line.');
      });
      await act(async () => {
        await result.current.save();
      });

      expect(mockSaveMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ blurbs: expect.objectContaining({ 't-1': 'One good line.' }) })
      );
    });
  });

  describe('writing blurbs with AI', () => {
    const generateWeek = async () => {
      mockGenerateMutateAsync.mockResolvedValue(facts(6, 'Bag Chasers', ['t-1', 't-2']));
      const hook = renderHook(() => useWeeklyContentPack());
      await act(async () => {
        await hook.result.current.generateFor('s-1', 6);
      });
      return hook;
    };

    it('replaces the plain lines and records that AI wrote them', async () => {
      mockBlurbsMutateAsync.mockResolvedValue({
        blurbs: { 't-1': 'Unbeaten and not close.', 't-2': 'Quietly climbing.' },
        model: 'claude-opus-5',
      });

      const { result } = await generateWeek();
      await act(async () => {
        expect(await result.current.generateBlurbs()).toBe('ok');
      });

      expect(result.current.draft.blurbs['t-1']).toBe('Unbeaten and not close.');
      expect(result.current.draft.blurbsSource).toBe('ai');
    });

    it('keeps the plain line for a team the writer skipped', async () => {
      mockBlurbsMutateAsync.mockResolvedValue({
        blurbs: { 't-1': 'Only this one came back.' },
        model: 'claude-opus-5',
      });

      const { result } = await generateWeek();
      const before = result.current.draft.blurbs['t-2'];
      await act(async () => {
        await result.current.generateBlurbs();
      });

      // Merged over the fallbacks, not swapped for them: a blank line under a
      // team on the graphic is worse than the plain one it already had.
      expect(result.current.draft.blurbs['t-1']).toBe('Only this one came back.');
      expect(result.current.draft.blurbs['t-2']).toBe(before);
    });

    it('reports "not set up" separately from "it broke"', async () => {
      const { CaptionUnconfiguredError } = await import('@/services/recapEditions/CaptionService');

      const { result } = await generateWeek();
      const before = { ...result.current.draft.blurbs };

      mockBlurbsMutateAsync.mockRejectedValueOnce(new CaptionUnconfiguredError());
      await act(async () => {
        expect(await result.current.generateBlurbs()).toBe('unconfigured');
      });

      mockBlurbsMutateAsync.mockRejectedValueOnce(new Error('502'));
      await act(async () => {
        expect(await result.current.generateBlurbs()).toBe('failed');
      });

      // Either way the plain lines are still in the boxes, so nothing is blocked.
      expect(result.current.draft.blurbs).toEqual(before);
      expect(result.current.draft.blurbsSource).toBe('fallback');
    });

    it('cannot run before a week has been generated', async () => {
      const { result } = renderHook(() => useWeeklyContentPack());
      await act(async () => {
        expect(await result.current.generateBlurbs()).toBe('failed');
      });
      expect(mockBlurbsMutateAsync).not.toHaveBeenCalled();
    });
  });
});
