import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RECAP_FACTS_SCHEMA_VERSION } from '@/types/recapEdition';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({ errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn() }));

import { DatabaseError } from '@/types/errors';

import { RecapEditionService } from '../RecapEditionService';

type QueryResult = { data: unknown; error: unknown };

const pgError = (message = 'query failed') => ({
  message,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

/** Records the payload each write sends, so the test can assert on it. */
function createSupabaseMock(queued: Record<string, QueryResult[]>) {
  const payloads: Record<string, unknown[]> = {};

  mockFrom.mockImplementation((table: string) => {
    const result = (queued[table] ?? []).shift() ?? { data: null, error: null };
    const query: Record<string, unknown> = {};
    const chain = () => query;

    Object.assign(query, {
      select: vi.fn(chain),
      eq: vi.fn(chain),
      in: vi.fn(chain),
      not: vi.fn(chain),
      order: vi.fn(chain),
      limit: vi.fn(chain),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      then: (resolve: (v: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
    });

    return {
      select: vi.fn(chain),
      insert: vi.fn((payload: unknown) => {
        (payloads[table] ??= []).push(payload);
        return query;
      }),
      update: vi.fn((payload: unknown) => {
        (payloads[table] ??= []).push(payload);
        return query;
      }),
    };
  });

  return payloads;
}

const editionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'e-1',
  season_id: 's-1',
  week_number: 6,
  season_slug: 'fall-2026',
  season_name: 'Fall 2026',
  status: 'draft',
  published_version_id: null,
  first_published_at: null,
  published_at: null,
  ...overrides,
});

describe('RecapEditionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveVersion', () => {
    it('lets the database number the version rather than sending one', async () => {
      const payloads = createSupabaseMock({
        recap_edition_versions: [{ data: { id: 'v-1', version: 1 }, error: null }],
      });

      await RecapEditionService.saveVersion({
        editionId: 'e-1',
        facts: { factsSchemaVersion: 1 } as never,
        headline: 'Week 6',
        caption: 'words',
        captionSource: 'manual',
      });

      const sent = payloads.recap_edition_versions[0] as Record<string, unknown>;
      // A read-then-write MAX(version) + 1 here would race two admins; the
      // BEFORE INSERT trigger owns it instead.
      expect(sent).not.toHaveProperty('version');
      expect(sent.facts_schema_version).toBe(RECAP_FACTS_SCHEMA_VERSION);
      expect(sent.caption_source).toBe('manual');
    });

    it('throws on a write failure', async () => {
      createSupabaseMock({ recap_edition_versions: [{ data: null, error: pgError() }] });

      await expect(
        RecapEditionService.saveVersion({
          editionId: 'e-1',
          facts: {} as never,
          headline: '',
          caption: '',
          captionSource: 'manual',
        })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('publish', () => {
    it('sets first_published_at on the first publish', async () => {
      const payloads = createSupabaseMock({
        recap_editions: [
          { data: { status: 'draft', first_published_at: null }, error: null },
          { data: editionRow({ status: 'published' }), error: null },
        ],
      });

      await RecapEditionService.publish('e-1', 'v-1');

      const sent = payloads.recap_editions[0] as Record<string, string | null>;
      expect(sent.status).toBe('published');
      expect(sent.published_version_id).toBe('v-1');
      expect(sent.first_published_at).toBe(sent.published_at);
    });

    it('leaves first_published_at alone on a correction', async () => {
      const payloads = createSupabaseMock({
        recap_editions: [
          {
            data: { status: 'published', first_published_at: '2026-10-16T12:00:00.000Z' },
            error: null,
          },
          { data: editionRow({ status: 'published' }), error: null },
        ],
      });

      await RecapEditionService.publish('e-1', 'v-2');

      const sent = payloads.recap_editions[0] as Record<string, string | null>;
      // The page says "Published <then>, corrected <now>", so the original date
      // must not move.
      expect(sent.first_published_at).toBe('2026-10-16T12:00:00.000Z');
      expect(sent.published_at).not.toBe('2026-10-16T12:00:00.000Z');
    });

    // Publish, Unpublish, Publish is the documented rollback, and the admin
    // screen calls that last step a plain Publish -- it never asks for a
    // correction note. Keeping the old first_published_at made the public page
    // print "Corrected <date>" with nothing behind it.
    it('starts the clock again when the edition was unpublished, not corrected', async () => {
      const payloads = createSupabaseMock({
        recap_editions: [
          {
            data: { status: 'unpublished', first_published_at: '2026-10-16T12:00:00.000Z' },
            error: null,
          },
          { data: editionRow({ status: 'published' }), error: null },
        ],
      });

      await RecapEditionService.publish('e-1', 'v-2');

      const sent = payloads.recap_editions[0] as Record<string, string | null>;
      // Equal dates are what the page reads as "no correction".
      expect(sent.first_published_at).toBe(sent.published_at);
      expect(sent.first_published_at).not.toBe('2026-10-16T12:00:00.000Z');
    });
  });

  describe('fetchLatestPublished', () => {
    it('returns null when nothing is published, rather than throwing', async () => {
      createSupabaseMock({ recap_editions: [{ data: null, error: null }] });

      await expect(RecapEditionService.fetchLatestPublished()).resolves.toBeNull();
    });

    it('returns null when an edition somehow points at no version', async () => {
      createSupabaseMock({
        recap_editions: [{ data: editionRow({ status: 'published' }), error: null }],
      });

      await expect(RecapEditionService.fetchLatestPublished()).resolves.toBeNull();
    });

    it('reads the exact version the edition points at', async () => {
      createSupabaseMock({
        recap_editions: [
          {
            data: editionRow({ status: 'published', published_version_id: 'v-2' }),
            error: null,
          },
        ],
        recap_edition_versions: [
          {
            data: { id: 'v-2', version: 2, facts: { factsSchemaVersion: 1, weekNumber: 6 } },
            error: null,
          },
        ],
      });

      const result = await RecapEditionService.fetchLatestPublished();

      expect(result?.version.id).toBe('v-2');
      expect(result?.facts.weekNumber).toBe(6);
    });

    it('throws on a database failure instead of reporting nothing published', async () => {
      createSupabaseMock({ recap_editions: [{ data: null, error: pgError() }] });

      await expect(RecapEditionService.fetchLatestPublished()).rejects.toThrow(DatabaseError);
    });
  });

  describe('ensureEdition', () => {
    it('reuses the edition already there rather than creating a second', async () => {
      const payloads = createSupabaseMock({
        recap_editions: [{ data: editionRow(), error: null }],
      });

      const edition = await RecapEditionService.ensureEdition({
        seasonId: 's-1',
        weekNumber: 6,
        seasonSlug: 'fall-2026',
        seasonName: 'Fall 2026',
      });

      expect(edition.id).toBe('e-1');
      expect(payloads.recap_editions).toBeUndefined();
    });

    it('freezes the season slug and name at creation', async () => {
      const payloads = createSupabaseMock({
        recap_editions: [
          { data: null, error: null },
          { data: editionRow(), error: null },
        ],
      });

      await RecapEditionService.ensureEdition({
        seasonId: 's-1',
        weekNumber: 6,
        seasonSlug: 'fall-2026',
        seasonName: 'Fall 2026',
      });

      // seasons.name can be edited later; a published address must not move.
      const sent = payloads.recap_editions[0] as Record<string, unknown>;
      expect(sent.season_slug).toBe('fall-2026');
      expect(sent.season_name).toBe('Fall 2026');
    });
  });
});
