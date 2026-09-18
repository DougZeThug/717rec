import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockService, mockToast } = vi.hoisted(() => ({
  mockService: {
    fetchLatestPublished: vi.fn(),
    fetchPublishedBySlug: vi.fn(),
    saveVersion: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
  },
  mockToast: vi.fn(),
}));

vi.mock('@/services/recapEditions/RecapEditionService', () => ({
  RecapEditionService: mockService,
}));
vi.mock('@/hooks/useToast', () => ({ toast: mockToast }));
// Both are imported lazily inside the mutations, so the admin-only caption
// code stays out of the bundle every visitor downloads.
vi.mock('@/services/recapEditions/fetchRecapFacts', () => ({ fetchRecapFacts: vi.fn() }));
vi.mock('@/services/recapEditions/CaptionService', () => ({
  generateCaption: vi.fn(),
  generateBlurbs: vi.fn(),
  CaptionUnconfiguredError: class CaptionUnconfiguredError extends Error {},
}));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn() }));

import {
  useGenerateBlurbs,
  useGenerateCaption,
  useGenerateRecapFacts,
  usePublishedRecapEdition,
  usePublishRecapEdition,
  useRecapEditionBySlug,
  useSaveRecapVersion,
  useUnpublishRecapEdition,
} from '../useRecapEditions';

let queryClient: QueryClient;
let invalidated: unknown[][];

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

beforeEach(() => {
  vi.clearAllMocks();
  invalidated = [];
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Record what each mutation invalidates, rather than asserting on internals.
  vi.spyOn(queryClient, 'invalidateQueries').mockImplementation((filters) => {
    invalidated.push((filters as { queryKey: unknown[] })?.queryKey);
    return Promise.resolve();
  });
});

describe('usePublishedRecapEdition', () => {
  it('reads the newest published edition for the home page', async () => {
    mockService.fetchLatestPublished.mockResolvedValue({ edition: { id: 'e-1' } });

    const { result } = renderHook(() => usePublishedRecapEdition(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ edition: { id: 'e-1' } });
  });

  it('treats "nothing published yet" as data, not a failure', async () => {
    mockService.fetchLatestPublished.mockResolvedValue(null);

    const { result } = renderHook(() => usePublishedRecapEdition(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The home page falls back to its live recap card on null.
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });
});

describe('useRecapEditionBySlug', () => {
  it('fetches the edition at a public address', async () => {
    mockService.fetchPublishedBySlug.mockResolvedValue({ edition: { id: 'e-1' } });

    const { result } = renderHook(() => useRecapEditionBySlug('fall-2026', 6), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockService.fetchPublishedBySlug).toHaveBeenCalledWith('fall-2026', 6);
  });

  it('does not fetch until both the season and the week are known', () => {
    const { result: noWeek } = renderHook(() => useRecapEditionBySlug('fall-2026'), { wrapper });
    const { result: noSlug } = renderHook(() => useRecapEditionBySlug(undefined, 6), { wrapper });
    const { result: neither } = renderHook(() => useRecapEditionBySlug(), { wrapper });

    // A half-built address must not hit the database.
    expect(mockService.fetchPublishedBySlug).not.toHaveBeenCalled();
    for (const r of [noWeek, noSlug, neither]) {
      expect(r.current.fetchStatus).toBe('idle');
    }
  });

  it('keys the cache by season and week, so two weeks cannot share a result', async () => {
    mockService.fetchPublishedBySlug.mockResolvedValue({ edition: { id: 'e-6' } });
    renderHook(() => useRecapEditionBySlug('fall-2026', 6), { wrapper });
    await waitFor(() => expect(mockService.fetchPublishedBySlug).toHaveBeenCalledTimes(1));

    mockService.fetchPublishedBySlug.mockResolvedValue({ edition: { id: 'e-7' } });
    renderHook(() => useRecapEditionBySlug('fall-2026', 7), { wrapper });

    await waitFor(() => expect(mockService.fetchPublishedBySlug).toHaveBeenCalledTimes(2));
    expect(mockService.fetchPublishedBySlug).toHaveBeenLastCalledWith('fall-2026', 7);
  });
});

describe('the mutations that write', () => {
  it('saving a draft refreshes the edition list', async () => {
    mockService.saveVersion.mockResolvedValue({ id: 'v-1' });

    const { result } = renderHook(() => useSaveRecapVersion(), { wrapper });
    await result.current.mutateAsync({ editionId: 'e-1' } as never);

    expect(invalidated).toContainEqual(['recap-editions']);
    expect(mockToast).toHaveBeenCalledWith({ title: 'Draft saved' });
  });

  it('publishing refreshes the edition list AND the home page card', async () => {
    mockService.publish.mockResolvedValue({ id: 'e-1', status: 'published' });

    const { result } = renderHook(() => usePublishRecapEdition(), { wrapper });
    await result.current.mutateAsync({ editionId: 'e-1', versionId: 'v-1' });

    // Both, or the home page keeps showing the previous week after publishing.
    expect(invalidated).toContainEqual(['recap-editions']);
    expect(invalidated).toContainEqual(['recap-edition', 'latest-published']);
  });

  it('unpublishing refreshes both as well, so the home page reverts', async () => {
    mockService.unpublish.mockResolvedValue({ id: 'e-1', status: 'unpublished' });

    const { result } = renderHook(() => useUnpublishRecapEdition(), { wrapper });
    await result.current.mutateAsync('e-1');

    expect(invalidated).toContainEqual(['recap-editions']);
    expect(invalidated).toContainEqual(['recap-edition', 'latest-published']);
    expect(mockToast).toHaveBeenCalledWith({ title: 'Recap unpublished' });
  });

  it('reports a failed publish without invalidating anything', async () => {
    mockService.publish.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePublishRecapEdition(), { wrapper });
    await expect(
      result.current.mutateAsync({ editionId: 'e-1', versionId: 'v-1' })
    ).rejects.toThrow();

    expect(invalidated).toEqual([]);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not publish the recap', variant: 'destructive' })
    );
  });

  it('reports a failed save and a failed unpublish the same way', async () => {
    mockService.saveVersion.mockRejectedValue(new Error('boom'));
    const save = renderHook(() => useSaveRecapVersion(), { wrapper });
    await expect(save.result.current.mutateAsync({} as never)).rejects.toThrow();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not save the draft', variant: 'destructive' })
    );

    mockService.unpublish.mockRejectedValue(new Error('boom'));
    const unpublish = renderHook(() => useUnpublishRecapEdition(), { wrapper });
    await expect(unpublish.result.current.mutateAsync('e-1')).rejects.toThrow();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not unpublish the recap', variant: 'destructive' })
    );
  });
});

describe('the mutations that only read', () => {
  it('generating facts invalidates nothing, because it writes nothing', async () => {
    const { fetchRecapFacts } = await import('@/services/recapEditions/fetchRecapFacts');
    vi.mocked(fetchRecapFacts).mockResolvedValue({ weekNumber: 6 } as never);

    const { result } = renderHook(() => useGenerateRecapFacts(), { wrapper });
    await result.current.mutateAsync({ seasonId: 's-1', weekNumber: 6 });

    expect(invalidated).toEqual([]);
  });

  it('tells the admin when building the recap fails', async () => {
    const { fetchRecapFacts } = await import('@/services/recapEditions/fetchRecapFacts');
    vi.mocked(fetchRecapFacts).mockRejectedValue(new Error('no snapshot'));

    const { result } = renderHook(() => useGenerateRecapFacts(), { wrapper });
    await expect(result.current.mutateAsync({ seasonId: 's-1', weekNumber: 6 })).rejects.toThrow();

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Could not build the recap', variant: 'destructive' })
    );
  });

  it('writes a caption and blurbs without touching the cache', async () => {
    const service = await import('@/services/recapEditions/CaptionService');
    vi.mocked(service.generateCaption).mockResolvedValue({ caption: 'hi', model: 'm' });
    vi.mocked(service.generateBlurbs).mockResolvedValue({ blurbs: { a: 'x' }, model: 'm' });

    const caption = renderHook(() => useGenerateCaption(), { wrapper });
    await caption.result.current.mutateAsync({ facts: {} as never, commissionerNote: '' });

    const blurbs = renderHook(() => useGenerateBlurbs(), { wrapper });
    await blurbs.result.current.mutateAsync({ facts: {} as never, commissionerNote: '' });

    expect(invalidated).toEqual([]);
    expect(service.generateCaption).toHaveBeenCalled();
    expect(service.generateBlurbs).toHaveBeenCalled();
  });
});
