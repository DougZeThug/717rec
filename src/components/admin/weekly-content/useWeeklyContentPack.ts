import { useCallback, useMemo, useState } from 'react';

import {
  useGenerateCaption,
  useGenerateRecapFacts,
  usePublishRecapEdition,
  useSaveRecapVersion,
  useUnpublishRecapEdition,
} from '@/hooks/useRecapEditions';
import type { Tables } from '@/integrations/supabase/types';
import { canPublishFacts } from '@/services/recapEditions/buildRecapFacts';
import { CaptionUnconfiguredError } from '@/services/recapEditions/CaptionService';
import type { CaptionSource } from '@/services/recapEditions/RecapEditionService';
import { RecapEditionService } from '@/services/recapEditions/RecapEditionService';
import type { RecapFactsV1 } from '@/types/recapEdition';
import { uploadRecapGraphic } from '@/utils/imageUpload';
import { warnLog } from '@/utils/logger';

import { buildFallbackCaption } from './fallbackCaption';

type EditionRow = Tables<'recap_editions'>;

export interface PackDraft {
  headline: string;
  caption: string;
  commissionerNote: string;
  captionSource: CaptionSource;
  captionModel: string | null;
}

const emptyDraft: PackDraft = {
  headline: '',
  caption: '',
  commissionerNote: '',
  captionSource: 'manual',
  captionModel: null,
};

/**
 * A default headline built only from facts that are actually there.
 *
 * Deliberately plain — it is a starting point the admin rewrites, not a claim.
 */
const defaultHeadline = (facts: RecapFactsV1): string => {
  if (facts.upsets[0]) {
    return `${facts.upsets[0].winnerName} take down ${facts.upsets[0].loserName}`;
  }
  if (facts.teamOfTheWeek) {
    return `${facts.teamOfTheWeek.teamName} lead the movers`;
  }
  if (facts.hotStreaks[0]) {
    return `${facts.hotStreaks[0].teamName} keep rolling`;
  }
  return `Week ${facts.weekNumber} results`;
};

/**
 * Holds one week's draft while an admin edits it.
 *
 * Generating replaces the facts but keeps whatever the admin has typed, so
 * re-generating after a score correction does not throw away a written caption.
 */
export const useWeeklyContentPack = () => {
  const [facts, setFacts] = useState<RecapFactsV1 | null>(null);
  /** The edition already on file for this week, if any. */
  const [existingEdition, setExistingEdition] = useState<EditionRow | null>(null);
  const [draft, setDraft] = useState<PackDraft>(emptyDraft);
  const [savedDraft, setSavedDraft] = useState<PackDraft>(emptyDraft);
  const [isPublishing, setIsPublishing] = useState(false);

  const generate = useGenerateRecapFacts();
  const captionRequest = useGenerateCaption();
  const saveVersion = useSaveRecapVersion();
  const publishEdition = usePublishRecapEdition();
  const unpublishEdition = useUnpublishRecapEdition();

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedDraft),
    [draft, savedDraft]
  );

  const setField = useCallback(<K extends keyof PackDraft>(field: K, value: PackDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const generateFor = useCallback(
    async (seasonId: string, weekNumber: number) => {
      const [next, edition] = await Promise.all([
        generate.mutateAsync({ seasonId, weekNumber }),
        RecapEditionService.fetchEditionForWeek(seasonId, weekNumber),
      ]);
      setFacts(next);
      setExistingEdition(edition);
      setDraft((current) => ({
        ...current,
        // Only fill fields the admin has not written for themselves, so
        // regenerating after a score correction never discards their words.
        headline: current.headline.trim() === '' ? defaultHeadline(next) : current.headline,
        caption: current.caption.trim() === '' ? buildFallbackCaption(next) : current.caption,
        captionSource: current.caption.trim() === '' ? 'fallback' : current.captionSource,
      }));
      return next;
    },
    [generate]
  );

  /** Save a draft version, returning the version id so publish can point at it. */
  const save = useCallback(
    async (correctionNote?: string, graphicUrl?: string | null) => {
      if (!facts) return null;

      const edition = await RecapEditionService.ensureEdition({
        seasonId: facts.seasonId,
        weekNumber: facts.weekNumber,
        seasonSlug: facts.seasonSlug,
        seasonName: facts.seasonName,
      });

      const version = await saveVersion.mutateAsync({
        editionId: edition.id,
        facts,
        headline: draft.headline,
        caption: draft.caption,
        captionSource: draft.captionSource,
        captionModel: draft.captionModel,
        commissionerNote: draft.commissionerNote.trim() || null,
        correctionNote: correctionNote ?? null,
        graphicUrl: graphicUrl ?? null,
      });

      setSavedDraft(draft);
      setExistingEdition(edition);
      return { editionId: edition.id, versionId: version.id };
    },
    [draft, facts, saveVersion]
  );

  /**
   * Publish, optionally with the summary graphic captured for the link preview.
   *
   * The upload is best-effort. A published recap that people can read matters
   * more than a thumbnail on a shared link, so a Storage failure is reported
   * and the publish carries on.
   */
  const publish = useCallback(
    async (correctionNote?: string, captureGraphic?: () => Promise<string | null>) => {
      setIsPublishing(true);
      try {
        // Uploaded BEFORE the version is written, because versions are
        // append-only: graphic_url has to be known at insert time.
        let graphicUrl: string | null = null;
        if (captureGraphic && facts) {
          try {
            const dataUrl = await captureGraphic();
            if (dataUrl) {
              graphicUrl = await uploadRecapGraphic(dataUrl, facts.seasonSlug, facts.weekNumber);
            }
          } catch (error) {
            warnLog('Recap publish: the link-preview graphic could not be stored', error);
          }
        }

        const saved = await save(correctionNote, graphicUrl);
        if (!saved) return;
        const published = await publishEdition.mutateAsync({
          editionId: saved.editionId,
          versionId: saved.versionId,
        });
        setExistingEdition(published);
      } finally {
        setIsPublishing(false);
      }
    },
    [facts, publishEdition, save]
  );

  /**
   * Replace the caption with an AI draft.
   *
   * Returns what happened rather than toasting, because "not set up" and "it
   * failed" need different words on screen. Either way the fallback caption is
   * still in the box, so the pack is never blocked on this.
   */
  const generateCaption = useCallback(async (): Promise<'ok' | 'unconfigured' | 'failed'> => {
    if (!facts) return 'failed';

    try {
      const result = await captionRequest.mutateAsync({
        facts,
        commissionerNote: draft.commissionerNote,
      });
      setDraft((current) => ({
        ...current,
        caption: result.caption,
        captionSource: 'ai',
        captionModel: result.model,
      }));
      return 'ok';
    } catch (error) {
      return error instanceof CaptionUnconfiguredError ? 'unconfigured' : 'failed';
    }
  }, [captionRequest, draft.commissionerNote, facts]);

  /**
   * Take a published edition back off the site.
   *
   * The home page falls back to its live recap card, so this is the rollback
   * when something published turns out to be wrong and there is no time to fix
   * it properly. Every version stays on file.
   */
  const unpublish = useCallback(async () => {
    if (!existingEdition) return;
    const updated = await unpublishEdition.mutateAsync(existingEdition.id);
    setExistingEdition(updated);
  }, [existingEdition, unpublishEdition]);

  const reset = useCallback(() => {
    setFacts(null);
    setExistingEdition(null);
    setDraft(emptyDraft);
    setSavedDraft(emptyDraft);
  }, []);

  return {
    facts,
    existingEdition,
    /** Publishing over a live edition is a correction, and is worded as one. */
    isCorrection: existingEdition?.status === 'published',
    publicPath: facts ? `/recap/${facts.seasonSlug}/week-${facts.weekNumber}` : null,
    draft,
    setField,
    isDirty,
    generateFor,
    isGenerating: generate.isPending,
    save,
    isSaving: saveVersion.isPending,
    publish,
    isPublishing,
    generateCaption,
    isGeneratingCaption: captionRequest.isPending,
    unpublish,
    isUnpublishing: unpublishEdition.isPending,
    canPublish: facts !== null && canPublishFacts(facts),
    reset,
  };
};
