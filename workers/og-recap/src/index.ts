/**
 * Gives a shared /recap/... link the right preview image.
 *
 * 717rec is a client-rendered SPA. Facebook, Instagram, X and Slack do not run
 * JavaScript, so the per-page tags SeoHead sets in the browser never reach
 * them — every recap link would preview with the generic league logo.
 *
 * This worker sits in front of the published origin on /recap/* only. For a
 * crawler it fetches the edition's stored graphic and caption and rewrites the
 * <head>. For a human it changes nothing.
 *
 * It fails OPEN. Any error, any timeout, any unexpected shape returns the
 * origin's own response untouched, so a problem here can never take the recap
 * page down.
 */

import { buildHeadTags, CRAWLER_PATTERN, type EditionPreview, RECAP_PATH } from './match';

interface Env {
  ORIGIN: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

/**
 * Read the published edition through PostgREST.
 *
 * Only published editions are readable by the anon key — that is the same RLS
 * policy the public page relies on, so this worker cannot leak a draft.
 */
async function fetchEdition(
  env: Env,
  seasonSlug: string,
  weekNumber: number
): Promise<EditionPreview | null> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/recap_editions`);
  url.searchParams.set(
    'select',
    'season_name,week_number,published_version_id,recap_edition_versions!recap_edition_versions_edition_id_fkey(id,headline,caption,graphic_url)'
  );
  url.searchParams.set('season_slug', `eq.${seasonSlug}`);
  url.searchParams.set('week_number', `eq.${weekNumber}`);
  url.searchParams.set('status', 'eq.published');
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(2500),
  });

  if (!response.ok) return null;

  const rows = (await response.json()) as Array<{
    season_name: string;
    week_number: number;
    published_version_id: string | null;
    recap_edition_versions?: Array<{
      id: string;
      headline: string | null;
      caption: string | null;
      graphic_url: string | null;
    }>;
  }>;

  const row = rows?.[0];
  if (!row) return null;

  const version = (row.recap_edition_versions ?? []).find(
    (candidate) => candidate.id === row.published_version_id
  );
  if (!version) return null;

  return {
    seasonName: row.season_name,
    weekNumber: row.week_number,
    headline: version.headline ?? '',
    caption: version.caption ?? '',
    graphicUrl: version.graphic_url,
  };
}

/** Replaces the OG/Twitter tags the SPA shell ships with the edition's own. */
class HeadRewriter {
  constructor(
    private readonly preview: EditionPreview,
    private readonly pageUrl: string
  ) {}

  element(element: Element): void {
    // buildHeadTags lives in match.ts so the test suite can read it: this file
    // uses HTMLRewriter, a Workers global the app's TypeScript does not know.
    element.append(buildHeadTags(this.preview, this.pageUrl).join(''), { html: true });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const originResponse = await fetch(request);

    try {
      const url = new URL(request.url);
      const match = RECAP_PATH.exec(url.pathname);
      if (!match) return originResponse;

      const userAgent = request.headers.get('user-agent') ?? '';
      if (!CRAWLER_PATTERN.test(userAgent)) return originResponse;

      if (!originResponse.headers.get('content-type')?.includes('text/html')) {
        return originResponse;
      }

      const preview = await fetchEdition(env, match[1], Number(match[2]));
      if (!preview) return originResponse;

      // Strip the shell's own tags first so the crawler does not see two of
      // each and pick the wrong one.
      return new HTMLRewriter()
        .on('meta[property^="og:"]', { element: (el) => el.remove() })
        .on('meta[name^="twitter:"]', { element: (el) => el.remove() })
        .on('head', new HeadRewriter(preview, url.toString()))
        .transform(originResponse);
    } catch {
      // Fail open, always. A broken worker must not break the page.
      return originResponse;
    }
  },
};
