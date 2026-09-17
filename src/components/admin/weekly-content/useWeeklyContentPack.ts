import { useCallback, useMemo, useState } from 'react';

import {
  useGenerateCaption,
  useGenerateRecapFacts,
  usePublishRecapEdition,
  useSaveRecapVersion,
} from '@/hooks/useRecapEditions';
import { canPublishFacts } from '@/services/recapEditions/buildRecapFacts';
import { CaptionUnconfiguredError } from '@/services/recapEditions/CaptionService';
import type { CaptionSource } from '@/services/recapEditions/RecapEditionService';
import { RecapEditionService } from '@/services/recapEditions/RecapEditionService';
import type { RecapFactsV1 } from '@/types/recapEdition';

import { buildFallbackCaption } from './fallbackCaption';

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
  const [draft, setDraft] = useState<PackDraft>(emptyDraft);
  const [savedDraft, setSavedDraft] = useState<PackDraft>(emptyDraft);
  const [isPublishing, setIsPublishing] = useState(false);

  const generate = useGenerateRecapFacts();
  const captionRequest = useGenerateCaption();
  const saveVersion = useSaveRecapVersion();
  const publishEdition = usePublishRecapEdition();

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedDraft),
    [draft, savedDraft]
  );

  const setField = useCallback(<K extends keyof PackDraft>(field: K, value: PackDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  }, []);

  const generateFor = useCallback(
    async (seasonId: string, weekNumber: number) => {
      const next = await generate.mutateAsync({ seasonId, weekNumber });
      setFacts(next);
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
    async (correctionNote?: string) => {
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
      });

      setSavedDraft(draft);
      return { editionId: edition.id, versionId: version.id };
    },
    [draft, facts, saveVersion]
  );

  const publish = useCallback(
    async (correctionNote?: string) => {
      setIsPublishing(true);
      try {
        const saved = await save(correctionNote);
        if (!saved) return;
        await publishEdition.mutateAsync({
          editionId: saved.editionId,
          versionId: saved.versionId,
        });
      } finally {
        setIsPublishing(false);
      }
    },
    [publishEdition, save]
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

  const reset = useCallback(() => {
    setFacts(null);
    setDraft(emptyDraft);
    setSavedDraft(emptyDraft);
  }, []);

  return {
    facts,
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
    canPublish: facts !== null && canPublishFacts(facts),
    reset,
  };
};
