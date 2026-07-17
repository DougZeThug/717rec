import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

import {
  checkRateLimit as defaultCheckRateLimit,
  getClientIp,
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

const REQUEST_TYPES = ['timeslot', 'score', 'join_league', 'general', 'other'] as const;

const PayloadSchema = z
  .object({
    request_type: z.enum(REQUEST_TYPES),
    submitter_name: z.string().trim().min(1).max(120),
    submitter_team: z.string().trim().max(120).optional().nullable(),
    submitter_contact: z.string().trim().min(1).max(255),
    players: z.string().trim().max(1000).optional().nullable(),
    message: z.string().trim().min(1).max(2000),
    website: z.string().max(500).optional(), // honeypot
  })
  .strict();

const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_MAX = 5;
const ENDPOINT_KEY = 'submit-contact-request';

function countUrls(text: string): number {
  const matches = text.match(/https?:\/\/|www\./gi);
  return matches ? matches.length : 0;
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const rl = await rateLimiterImpl(supabase, {
    endpoint: ENDPOINT_KEY,
    ipHash,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    maxHits: RATE_LIMIT_MAX,
  });
  if (rl.error) console.warn('[ContactRequest] rate-limit error:', rl.error);
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

  if (payload.website && payload.website.trim().length > 0) {
    return jsonResponse({ success: true }, 200, corsHeaders);
  }
  if (countUrls(payload.message) > 5) {
    return jsonResponse({ error: 'Message contains too many links' }, 400, corsHeaders);
  }

  // Verify signed-in user from JWT (if present) and override name/team
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
      console.warn('[ContactRequest] user verification failed:', err);
    }
  }

  const insertRow = {
    request_type: payload.request_type,
    submitter_name: verifiedName ?? payload.submitter_name,
    submitter_team: verifiedTeam ?? payload.submitter_team ?? null,
    submitter_contact: payload.submitter_contact,
    players: payload.players ?? null,
    message: payload.message,
    user_id,
    team_id,
    is_verified,
  };

  const { error: insertError } = await supabase.from('contact_requests').insert(insertRow);
  if (insertError) {
    console.error('[ContactRequest] insert error:', insertError);
    return jsonResponse({ error: 'Failed to save request' }, 500, corsHeaders);
  }

  return jsonResponse({ success: true }, 200, corsHeaders);
}

export { handleRequest };

serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('[ContactRequest] Error:', error);
    const corsHeaders = buildCorsHeaders(req);
    return jsonResponse({ error: 'Failed to process request' }, 500, corsHeaders);
  }
});
