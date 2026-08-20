import type { ToolContext } from '@lovable.dev/mcp-js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Build a user-scoped Supabase client that forwards the caller's OAuth token so RLS runs as that user. */
export function userClient(ctx: ToolContext): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'MCP userClient: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) must be set'
    );
  }
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string | undefined
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error) return false;
  return data?.is_admin === true;
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
 * Resolve the signed-in user's single approved team membership.
 *
 * A user must have exactly one approved membership (enforced by the partial
 * unique index idx_one_approved_membership_per_user). We still fetch two rows
 * and fail loudly if duplicates exist, because `maybeSingle()` would silently
 * return an arbitrary team.
 */
export async function getApprovedTeamId<T extends { team_id: string } = { team_id: string }>(
  supabase: SupabaseClient,
  userId: string | undefined,
  columns = 'team_id'
): Promise<{ data: T | null; error: string | null }> {
  if (!userId) return { data: null, error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('team_memberships')
    .select(columns)
    .eq('user_id', userId)
    .eq('is_approved', true)
    .limit(2);
  if (error) return { data: null, error: error.message };
  const rows = (data ?? []) as unknown as T[];
  if (rows.length > 1) {
    return {
      data: null,
      error:
        'Multiple approved team memberships found for this user. Ask an admin to remove the extra membership before using this tool.',
    };
  }
  return { data: rows[0] ?? null, error: null };
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
