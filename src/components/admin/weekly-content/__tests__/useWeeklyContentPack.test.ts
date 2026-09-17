import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecapFactsV1 } from '@/types/recapEdition';

const {
  mockGenerateMutateAsync,
  mockFetchEditionForWeek,
  mockFetchLatestVersion,
  mockSaveMutateAsync,
} = vi.hoisted(() => ({
  mockGenerateMutateAsync: vi.fn(),
  mockFetchEditionForWeek: vi.fn(),
  mockFetchLatestVersion: vi.fn(),
  mockSaveMutateAsync: vi.fn(),
}));

vi.mock('@/hooks/useRecapEditions', () => ({
  useGenerateRecapFacts: () => ({ mutateAsync: mockGenerateMutateAsync, isPending: false }),
  useGenerateCaption: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

const facts = (weekNumber: number, winnerName: string): RecapFactsV1 => ({
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
});
