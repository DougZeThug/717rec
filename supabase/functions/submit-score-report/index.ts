import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

import {
  checkRateLimit as defaultCheckRateLimit,
  getTrustedClientIp,
  hashIp,
} from '../_shared/rateLimit.ts';
import { SECURITY_HEADERS } from '../_shared/securityHeaders.ts';

type RateLimitFn = typeof defaultCheckRateLimit;

// Test seam — overridable from tests via setRateLimiter().
let rateLimiterImpl: RateLimitFn = defaultCheckRateLimit;
export function setRateLimiter(fn: RateLimitFn | null): void {
  rateLimiterImpl = fn ?? defaultCheckRateLimit;
}

const ALLOWED_ORIGINS = new Set<string>([
  'https://717rec.app',
  'https://717rec.lovable.app',
  'https://id-preview--71485458-eece-4db2-a818-0dbc3e38e42e.lovable.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
]);

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

const PayloadSchema = z
  .object({
    match_id: z.string().uuid(),
    submitter_name: z.string().trim().min(1).max(120),
    submitter_team: z.string().trim().max(120).optional().nullable(),
    message: z.string().trim().min(1).max(2000),
    website: z.string().max(500).optional(), // honeypot
  })
  .strict();

const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_MAX = 5;
const ENDPOINT_KEY = 'submit-score-report';

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Service-role client. Built per request so the env is read at request time.
function createAdminClient() {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
type SupabaseAdmin = ReturnType<typeof createAdminClient>;
type ReportPayload = z.infer<typeof PayloadSchema>;

type ParsedPayload = { ok: true; payload: ReportPayload } | { ok: false; response: Response };

async function parseReportPayload(
  req: Request,
  cors: Record<string, string>
): Promise<ParsedPayload> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: jsonResponse({ error: 'Invalid JSON body' }, 400, cors) };
  }

  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonResponse(
        { error: 'Invalid request', issues: parsed.error.flatten().fieldErrors },
        400,
        cors
      ),
    };
  }
  return { ok: true, payload: parsed.data };
}

function isHoneypotFilled(payload: ReportPayload): boolean {
  return !!payload.website && payload.website.trim().length > 0;
}

/** A Response to send back when the match is missing or cannot be checked, else null. */
async function checkMatchExists(
  supabase: SupabaseAdmin,
  matchId: string,
  cors: Record<string, string>
): Promise<Response | null> {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .maybeSingle();
  if (matchError) {
    console.error('[ScoreReport] match lookup error:', matchError);
    return jsonResponse({ error: 'Failed to verify match' }, 500, cors);
  }
  if (!match) {
    return jsonResponse({ error: 'Match not found' }, 404, cors);
  }
  return null;
}

interface VerifiedSubmitter {
  user_id: string | null;
  team_id: string | null;
  is_verified: boolean;
  verifiedName: string | null;
  verifiedTeam: string | null;
}

async function lookupProfileName(supabase: SupabaseAdmin, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .eq('id', userId)
    .maybeSingle();
  return (profile?.full_name as string | null) || (profile?.username as string | null) || null;
}

async function lookupApprovedTeam(
  supabase: SupabaseAdmin,
  userId: string
): Promise<{ team_id: string | null; name: string | null }> {
  const { data: membership } = await supabase
    .from('team_memberships')
    .select('team_id, is_approved, team:teams(id, name)')
    .eq('user_id', userId)
    .eq('is_approved', true)
    .maybeSingle();
  if (!membership?.team_id) return { team_id: null, name: null };

  const team = (membership as { team?: { name?: string } }).team;
  return { team_id: membership.team_id as string, name: team?.name ?? null };
}

/**
 * If signed in, prefer the verified name/team and record user/team for the
 * audit trail. Best effort: any failure is logged and the report is saved as
 * an unverified one.
 */
async function resolveVerifiedSubmitter(
  supabase: SupabaseAdmin,
  authHeader: string | null
): Promise<VerifiedSubmitter> {
  const result: VerifiedSubmitter = {
    user_id: null,
    team_id: null,
    is_verified: false,
    verifiedName: null,
    verifiedTeam: null,
  };
  if (!authHeader?.startsWith('Bearer ')) return result;

  const token = authHeader.slice('Bearer '.length);
  try {
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return result;

    result.user_id = userId;
    result.is_verified = true;
    result.verifiedName = await lookupProfileName(supabase, userId);

    const team = await lookupApprovedTeam(supabase, userId);
    result.team_id = team.team_id;
    result.verifiedTeam = team.name;
  } catch (err) {
    console.warn('[ScoreReport] user verification failed:', err);
  }
  return result;
}

/**
 * Dedupe pre-check: an identical pending report for the same match already
 * exists (e.g. double-tap). A lookup error is only logged; the insert goes on.
 */
async function hasPendingDuplicate(
  supabase: SupabaseAdmin,
  payload: ReportPayload,
  submitterName: string
): Promise<boolean> {
  const { data: existing, error: dedupeError } = await supabase
    .from('score_submissions')
    .select('id')
    .eq('match_id', payload.match_id)
    .eq('status', 'pending')
    .eq('message', payload.message)
    .eq('submitter_name', submitterName)
    .limit(1)
    .maybeSingle();
  if (dedupeError) {
    console.warn('[ScoreReport] dedupe pre-check error:', dedupeError);
  }
  return !!existing;
}

async function saveReport(
  supabase: SupabaseAdmin,
  insertRow: Record<string, unknown>
): Promise<'saved' | 'duplicate' | 'failed'> {
  const { error: insertError } = await supabase.from('score_submissions').insert(insertRow);
  if (!insertError) return 'saved';

  // 23505 = unique_violation — partial unique index caught a racing duplicate
  // between the pre-check and the insert. Same friendly response.
  if ((insertError as { code?: string }).code === '23505') return 'duplicate';

  console.error('[ScoreReport] insert error:', insertError);
  return 'failed';
}

async function handleRequest(req: Request): Promise<Response> {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  const ip = getTrustedClientIp(req);
  const ipHash = await hashIp(ip);

  const supabase = createAdminClient();

  const rl = await rateLimiterImpl(supabase, {
    endpoint: ENDPOINT_KEY,
    ipHash,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    maxHits: RATE_LIMIT_MAX,
  });
  if (rl.error) console.warn('[ScoreReport] rate-limit error:', rl.error);
  if (!rl.allowed) {
    return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429, corsHeaders);
  }

  const parsed = await parseReportPayload(req, corsHeaders);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.payload;

  // Honeypot: silently accept
  if (isHoneypotFilled(payload)) {
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  const matchProblem = await checkMatchExists(supabase, payload.match_id, corsHeaders);
  if (matchProblem) return matchProblem;

  const submitter = await resolveVerifiedSubmitter(supabase, req.headers.get('Authorization'));

  const insertRow = {
    match_id: payload.match_id,
    submitter_name: submitter.verifiedName ?? payload.submitter_name,
    submitter_team: submitter.verifiedTeam ?? payload.submitter_team ?? null,
    message: payload.message,
    user_id: submitter.user_id,
    team_id: submitter.team_id,
    is_verified: submitter.is_verified,
  };

  // Treat a duplicate as success without inserting a second row and without
  // leaking whether one exists to unrelated callers — the response shape
  // mirrors a fresh submission.
  if (await hasPendingDuplicate(supabase, payload, insertRow.submitter_name)) {
    return jsonResponse({ success: true, duplicate: true }, 200, corsHeaders);
  }

  const outcome = await saveReport(supabase, insertRow);
  if (outcome === 'duplicate') {
    return jsonResponse({ success: true, duplicate: true }, 200, corsHeaders);
  }
  if (outcome === 'failed') {
    return jsonResponse({ error: 'Failed to save score report' }, 500, corsHeaders);
  }

  return jsonResponse({ success: true }, 200, corsHeaders);
}

export { handleRequest };

serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('[ScoreReport] Error:', error);
    const corsHeaders = buildCorsHeaders(req);
    return jsonResponse({ error: 'Failed to process request' }, 500, corsHeaders);
  }
});
