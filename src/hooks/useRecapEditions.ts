import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/useToast';
import type { CaptionTone } from '@/services/recapEditions/CaptionService';
import type { SaveVersionInput } from '@/services/recapEditions/RecapEditionService';
import { RecapEditionService } from '@/services/recapEditions/RecapEditionService';
import type { RecapFactsV1 } from '@/types/recapEdition';
import { getUIErrorMessage } from '@/utils/errorHandler';

const LATEST_PUBLISHED_KEY = ['recap-edition', 'latest-published'] as const;

/**
 * The newest published edition, for the home page.
 *
 * `null` means nothing has been published yet, which is a state rather than a
 * failure — the home page falls back to its live recap card.
 */
export const usePublishedRecapEdition = () =>
  useQuery({
    queryKey: LATEST_PUBLISHED_KEY,
    queryFn: () => RecapEditionService.fetchLatestPublished(),
    staleTime: 1000 * 60 * 5,
  });

/** One published edition by its public address. */
export const useRecapEditionBySlug = (seasonSlug?: string, weekNumber?: number) =>
  useQuery({
    queryKey: ['recap-edition', seasonSlug, weekNumber],
    queryFn: () =>
      seasonSlug && typeof weekNumber === 'number'
        ? RecapEditionService.fetchPublishedBySlug(seasonSlug, weekNumber)
        : Promise.resolve(null),
    enabled: Boolean(seasonSlug) && typeof weekNumber === 'number',
    staleTime: 1000 * 60 * 10,
  });

/** Every edition for a season, for the admin picker. Admin-only by RLS. */
export const useRecapEditionsForSeason = (seasonId?: string) =>
  useQuery({
    queryKey: ['recap-editions', seasonId],
    queryFn: () =>
      seasonId ? RecapEditionService.fetchEditionsForSeason(seasonId) : Promise.resolve([]),
    enabled: Boolean(seasonId),
    staleTime: 1000 * 60 * 5,
  });

/**
 * Build a draft's facts for one week.
 *
 * A mutation rather than a query because generating is an explicit act — an
 * admin presses Generate — and re-running it on a refetch would silently swap
 * the numbers under a draft they are part-way through editing.
 */
export const useGenerateRecapFacts = () =>
  useMutation({
    mutationFn: async ({ seasonId, weekNumber }: { seasonId: string; weekNumber: number }) => {
      // Imported on demand. Statically this reaches WeeklyRecapService, the
      // prediction model and the career pipeline, none of which anyone waiting
      // for the admin console to paint needs until they press Generate.
      const { fetchRecapFacts } = await import('@/services/recapEditions/fetchRecapFacts');
      return fetchRecapFacts(seasonId, weekNumber);
    },
    onError: (error) => {
      toast({
        title: 'Could not build the recap',
        description: getUIErrorMessage(error, 'Failed to build the recap'),
        variant: 'destructive',
      });
    },
  });

/**
 * Ask the edge function for a caption draft.
 *
 * A mutation with no toast of its own: the screen handles the outcomes, because
 * "not configured" and "it broke" need different words and a fallback caption
 * is written either way.
 */
export const useGenerateCaption = () =>
  useMutation({
    mutationFn: async ({
      facts,
      commissionerNote,
      tone,
    }: {
      facts: RecapFactsV1;
      commissionerNote: string;
      tone?: CaptionTone;
    }) => {
      const { generateCaption } = await import('@/services/recapEditions/CaptionService');
      return generateCaption(facts, commissionerNote, tone);
    },
  });

export const useSaveRecapVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveVersionInput) => RecapEditionService.saveVersion(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recap-editions'] });
      toast({ title: 'Draft saved' });
    },
    onError: (error) => {
      toast({
        title: 'Could not save the draft',
        description: getUIErrorMessage(error, 'Failed to save the draft'),
        variant: 'destructive',
      });
    },
  });
};

export const usePublishRecapEdition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ editionId, versionId }: { editionId: string; versionId: string }) =>
      RecapEditionService.publish(editionId, versionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recap-editions'] });
      void queryClient.invalidateQueries({ queryKey: LATEST_PUBLISHED_KEY });
      toast({ title: 'Recap published' });
    },
    onError: (error) => {
      toast({
        title: 'Could not publish the recap',
        description: getUIErrorMessage(error, 'Failed to publish the recap'),
        variant: 'destructive',
      });
    },
  });
};

export const useUnpublishRecapEdition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (editionId: string) => RecapEditionService.unpublish(editionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recap-editions'] });
      void queryClient.invalidateQueries({ queryKey: LATEST_PUBLISHED_KEY });
      toast({ title: 'Recap unpublished' });
    },
    onError: (error) => {
      toast({
        title: 'Could not unpublish the recap',
        description: getUIErrorMessage(error, 'Failed to unpublish the recap'),
        variant: 'destructive',
      });
    },
  });
};
