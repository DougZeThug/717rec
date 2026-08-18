import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function projectUrl(): string {
  const url = configuredEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  if (!url) throw new Error('SUPABASE_URL (or VITE_SUPABASE_URL) is required');
  return url;
}

function publishableKey(): string {
  const direct = configuredEnv(['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
  if (direct) return direct;

  const keyset = runtimeEnv('SUPABASE_PUBLISHABLE_KEYS');
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === 'string' && v.trim().startsWith('sb_publishable_'))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // Malformed dictionary; fall through to the legacy names.
    }
  }

  const legacy = configuredEnv(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']);
  if (legacy) return legacy;
  throw new Error(
    'SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS, or SUPABASE_ANON_KEY is required'
  );
}

/**
 * Anonymous Supabase client for the PUBLIC MCP server. No caller identity is
 * forwarded, so RLS runs as `anon`. Never use a service-role key here.
 */
export function anonClient(): SupabaseClient {
  return createClient(projectUrl(), publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function textResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: { data: payload } as Record<string, unknown>,
  };
}

export function errorResult(message: string) {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  };
}

export async function getActiveSeasonId(
  supabase: SupabaseClient
): Promise<{ data: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: data?.id ?? null, error: null };
}


/**
 * Hidden-division teams are administrative placeholders, not league entrants.
 * The frontend already skips them (src/utils/teamGrouping.ts); public tool
 * output must skip them too, or they surface in the standings.
 * Covers both seeded rows, "Hidden" and "Hidden2", via display_division.
 */
export function isHiddenDivision(divisionName: string | null | undefined): boolean {
  return (divisionName ?? '').toLowerCase().startsWith('hidden');
}

type EmbeddedDivision = { name?: string | null; display_division?: string | null } | null;
type EmbeddedTeam = { divisions?: EmbeddedDivision | EmbeddedDivision[] } | null;

/**
 * PostgREST returns a to-one embed as an object, but the generated types model
 * these relationships as arrays. Accept either shape rather than casting the
 * discrepancy away.
 */
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Hidden check for a team_season_stats row.
 *
 * Prefers the team's CURRENT division over the cached
 * team_season_stats.division_name. That column is a denormalised copy which only
 * refreshes on the next stats upsert, so a team just moved to Hidden can linger
 * in listings until some unrelated match is scored. These tools only ever query
 * the active season, so current membership is the authoritative answer.
 *
 * Falls back to the cached label when the division join is absent.
 */
export function isHiddenTeamRow(
  divisionName: string | null | undefined,
  team: EmbeddedTeam | EmbeddedTeam[] | undefined
): boolean {
  const live = firstOrSelf(firstOrSelf(team)?.divisions);
  if (live) {
    return isHiddenDivision(live.display_division) || isHiddenDivision(live.name);
  }
  return isHiddenDivision(divisionName);
}
