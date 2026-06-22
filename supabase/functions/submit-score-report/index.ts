import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

import { checkRateLimit, hashIp } from '../_shared/rateLimit.ts';

const ALLOWED_ORIGINS = new Set<string>([
  'https://717rec.app',
  'https://717rec.lovable.app',
  'https://id-preview--71485458-eece-4db2-a818-0dbc3e38e42e.lovable.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const headers: Record<string, string> = {
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

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const rl = await checkRateLimit(supabase, {
    endpoint: ENDPOINT_KEY,
    ipHash,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    maxHits: RATE_LIMIT_MAX,
  });
  if (rl.error) console.warn('[ScoreReport] rate-limit error:', rl.error);
  if (!rl.allowed) {
    return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429, corsHeaders);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
  }

  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'Invalid request', issues: parsed.error.flatten().fieldErrors },
      400,
      corsHeaders
    );
  }
  const payload = parsed.data;

  // Honeypot: silently accept
  if (payload.website && payload.website.trim().length > 0) {
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  // Verify match exists
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .eq('id', payload.match_id)
    .maybeSingle();
  if (matchError) {
    console.error('[ScoreReport] match lookup error:', matchError);
    return jsonResponse({ error: 'Failed to verify match' }, 500, corsHeaders);
  }
  if (!match) {
    return jsonResponse({ error: 'Match not found' }, 404, corsHeaders);
  }

  // If signed in, prefer verified name/team and record user/team for audit trail
  let user_id: string | null = null;
  let team_id: string | null = null;
  let is_verified = false;
  let verifiedName: string | null = null;
  let verifiedTeam: string | null = null;

  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    try {
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user?.id) {
        user_id = userData.user.id;
        is_verified = true;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .eq('id', user_id)
          .maybeSingle();
        verifiedName =
          (profile?.full_name as string | null) || (profile?.username as string | null) || null;

        const { data: membership } = await supabase
          .from('team_memberships')
          .select('team_id, is_approved, team:teams(id, name)')
          .eq('user_id', user_id)
          .eq('is_approved', true)
          .maybeSingle();
        if (membership?.team_id) {
          team_id = membership.team_id as string;
          const team = (membership as { team?: { name?: string } }).team;
          verifiedTeam = team?.name ?? null;
        }
      }
    } catch (err) {
      console.warn('[ScoreReport] user verification failed:', err);
    }
  }

  const insertRow = {
    match_id: payload.match_id,
    submitter_name: verifiedName ?? payload.submitter_name,
    submitter_team: verifiedTeam ?? payload.submitter_team ?? null,
    message: payload.message,
    user_id,
    team_id,
    is_verified,
  };

  const { error: insertError } = await supabase.from('score_submissions').insert(insertRow);
  if (insertError) {
    console.error('[ScoreReport] insert error:', insertError);
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
