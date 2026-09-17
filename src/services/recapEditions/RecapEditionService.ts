import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { RecapFactsV1 } from '@/types/recapEdition';
import { RECAP_FACTS_SCHEMA_VERSION } from '@/types/recapEdition';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

type EditionRow = Tables<'recap_editions'>;
type VersionRow = Tables<'recap_edition_versions'>;

const EDITION_COLUMNS =
  'id, season_id, week_number, season_slug, season_name, status, published_version_id, first_published_at, published_at, published_by, created_at, created_by, updated_at';

const VERSION_COLUMNS =
  'id, edition_id, version, facts, facts_schema_version, headline, caption, caption_source, caption_model, commissioner_note, correction_note, graphic_url, created_at, created_by';

export type CaptionSource = 'ai' | 'ai_edited' | 'manual' | 'fallback';

export interface RecapEditionWithVersion {
  edition: EditionRow;
  version: VersionRow;
  facts: RecapFactsV1;
}

export interface SaveVersionInput {
  editionId: string;
  facts: RecapFactsV1;
  headline: string;
  caption: string;
  captionSource: CaptionSource;
  captionModel?: string | null;
  commissionerNote?: string | null;
  correctionNote?: string | null;
  graphicUrl?: string | null;
}

/**
 * A published recap is a saved edition. Corrections append a version rather
 * than rewriting one, which the database enforces — recap_edition_versions has
 * no UPDATE or DELETE grant.
 */
export const RecapEditionService = {
  /** Every edition for a season, newest week first. Admin-only by RLS. */
  fetchEditionsForSeason: async (seasonId: string): Promise<EditionRow[]> => {
    const { data, error } = await supabase
      .from('recap_editions')
      .select(EDITION_COLUMNS)
      .eq('season_id', seasonId)
      .order('week_number', { ascending: false });

    if (error) handleDatabaseError(error, 'Failed to fetch recap editions');
    return data ?? [];
  },

  /** The edition for one week, or null when none has been started. */
  fetchEditionForWeek: async (seasonId: string, weekNumber: number): Promise<EditionRow | null> => {
    const { data, error } = await supabase
      .from('recap_editions')
      .select(EDITION_COLUMNS)
      .eq('season_id', seasonId)
      .eq('week_number', weekNumber)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch the recap edition');
    return data ?? null;
  },

  /**
   * Create the edition for a week, or return the one already there.
   *
   * The season slug and name are frozen here on purpose: seasons.name can be
   * edited later and a published address must not move under a shared link.
   */
  ensureEdition: async (input: {
    seasonId: string;
    weekNumber: number;
    seasonSlug: string;
    seasonName: string;
  }): Promise<EditionRow> => {
    const existing = await RecapEditionService.fetchEditionForWeek(
      input.seasonId,
      input.weekNumber
    );
    if (existing) return existing;

    const { data, error } = await supabase
      .from('recap_editions')
      .insert({
        season_id: input.seasonId,
        week_number: input.weekNumber,
        season_slug: input.seasonSlug,
        season_name: input.seasonName,
      })
      .select(EDITION_COLUMNS)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to create the recap edition');
    return ensureFound(data, 'Recap edition', `${input.seasonSlug} week ${input.weekNumber}`);
  },

  /**
   * Append a version. `version` is deliberately not sent — a BEFORE INSERT
   * trigger assigns it, because a read-then-write MAX(version) + 1 here would
   * race two admins saving at once.
   */
  saveVersion: async (input: SaveVersionInput): Promise<VersionRow> => {
    const { data, error } = await supabase
      .from('recap_edition_versions')
      .insert({
        edition_id: input.editionId,
        facts: input.facts as unknown as Tables<'recap_edition_versions'>['facts'],
        facts_schema_version: RECAP_FACTS_SCHEMA_VERSION,
        headline: input.headline,
        caption: input.caption,
        caption_source: input.captionSource,
        caption_model: input.captionModel ?? null,
        commissioner_note: input.commissionerNote ?? null,
        correction_note: input.correctionNote ?? null,
        graphic_url: input.graphicUrl ?? null,
      })
      .select(VERSION_COLUMNS)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to save the recap draft');
    return ensureFound(data, 'Recap version', input.editionId);
  },

  /** The newest version of an edition, published or not. Admin-only by RLS. */
  fetchLatestVersion: async (editionId: string): Promise<VersionRow | null> => {
    const { data, error } = await supabase
      .from('recap_edition_versions')
      .select(VERSION_COLUMNS)
      .eq('edition_id', editionId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch the recap draft');
    return data ?? null;
  },

  /**
   * Point an edition at a version and make it public.
   *
   * first_published_at is set once and never moved, so the page can say
   * "Published <date>" and, for a correction, "Corrected <date>".
   */
  publish: async (editionId: string, versionId: string): Promise<EditionRow> => {
    const existing = await supabase
      .from('recap_editions')
      .select('first_published_at')
      .eq('id', editionId)
      .maybeSingle();

    if (existing.error) handleDatabaseError(existing.error, 'Failed to read the recap edition');

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('recap_editions')
      .update({
        status: 'published',
        published_version_id: versionId,
        published_at: now,
        first_published_at: existing.data?.first_published_at ?? now,
      })
      .eq('id', editionId)
      .select(EDITION_COLUMNS)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to publish the recap');
    return ensureFound(data, 'Recap edition', editionId);
  },

  /** Take a published edition back off the public site. Its versions survive. */
  unpublish: async (editionId: string): Promise<EditionRow> => {
    const { data, error } = await supabase
      .from('recap_editions')
      .update({ status: 'unpublished' })
      .eq('id', editionId)
      .select(EDITION_COLUMNS)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to unpublish the recap');
    return ensureFound(data, 'Recap edition', editionId);
  },

  /**
   * The newest published edition, for the home page. Returns null rather than
   * throwing when nothing has been published — that is a state, not a failure.
   */
  fetchLatestPublished: async (): Promise<RecapEditionWithVersion | null> => {
    const { data: edition, error } = await supabase
      .from('recap_editions')
      .select(EDITION_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch the published recap');
    if (!edition?.published_version_id) return null;

    return RecapEditionService.fetchPublishedVersion(edition);
  },

  /** A published edition by its public address, or null when there is none. */
  fetchPublishedBySlug: async (
    seasonSlug: string,
    weekNumber: number
  ): Promise<RecapEditionWithVersion | null> => {
    const { data: edition, error } = await supabase
      .from('recap_editions')
      .select(EDITION_COLUMNS)
      .eq('season_slug', seasonSlug)
      .eq('week_number', weekNumber)
      .eq('status', 'published')
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch the recap');
    if (!edition?.published_version_id) return null;

    return RecapEditionService.fetchPublishedVersion(edition);
  },

  /** Load the exact version an edition points at. */
  fetchPublishedVersion: async (edition: EditionRow): Promise<RecapEditionWithVersion | null> => {
    if (!edition.published_version_id) return null;

    const { data: version, error } = await supabase
      .from('recap_edition_versions')
      .select(VERSION_COLUMNS)
      .eq('id', edition.published_version_id)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to fetch the recap contents');
    if (!version) return null;

    return {
      edition,
      version,
      facts: version.facts as unknown as RecapFactsV1,
    };
  },
};
