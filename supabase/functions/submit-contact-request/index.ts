import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

import { escapeHtml, sendAdminEmail, stripControlChars } from '../_shared/email.ts';
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

const REQUEST_TYPES = ['timeslot', 'score', 'join_league', 'general', 'other'] as const;

/** Request type as an admin reads it, for the notification subject line. */
const REQUEST_TYPE_LABELS: Record<string, string> = {
  timeslot: 'Timeslot Request',
  score: 'Score update / correction',
  join_league: 'Join the league',
  general: 'General message',
  other: 'Other',
};

const PayloadSchema = z
  .object({
    request_type: z.enum(REQUEST_TYPES),
    submitter_name: z.string().trim().min(1).max(120),
    submitter_team: z.string().trim().max(120).optional().nullable(),
    // Required: the DB column is NOT NULL and the league needs a way to reply.
    // Marking it optional here turned an omitted field into an opaque 500 on
    // insert; a min(1) requirement yields a clean 400 with a field message.
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

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  const ip = getTrustedClientIp(req);
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
  if (rl.error) {
    // Fail closed (see rateLimit.ts): the RPC error also drives allowed=false.
    console.warn('[ContactRequest] rate-limit RPC error (failing closed):', rl.error);
  }
  if (!rl.allowed) {
    return jsonResponse({ error: 'Too many requests. Please try again later.' }, 429, {
      ...corsHeaders,
      'Retry-After': String(RATE_LIMIT_WINDOW_SECONDS),
    });
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

  // The row is the durable record and it is already saved. The email is a
  // best-effort alert on top, so a failed send must NOT become a 500 — that
  // would make the client retry and duplicate a request we actually kept.
  const emailed = await notifyAdmins(insertRow);

  return jsonResponse({ success: true, emailed }, 200, corsHeaders);
}

/** Alert the league that a new request landed in the admin Contact Inbox. */
async function notifyAdmins(row: {
  request_type: string;
  submitter_name: string;
  submitter_team: string | null;
  submitter_contact: string;
  players: string | null;
  message: string;
  is_verified: boolean;
}): Promise<boolean> {
  const typeLabel = REQUEST_TYPE_LABELS[row.request_type] ?? row.request_type;
  // Strip control chars before the name reaches the Subject header.
  const cleanName = stripControlChars(row.submitter_name);
  const safeName = escapeHtml(cleanName);
  const safeTeam = row.submitter_team ? escapeHtml(row.submitter_team) : null;
  const safeContact = escapeHtml(row.submitter_contact);
  const safeMessage = escapeHtml(row.message);
  const safePlayers = row.players ? escapeHtml(row.players) : null;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New League Request</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>From:</strong> ${safeName}${row.is_verified ? ' (verified)' : ''}</p>
        ${safeTeam ? `<p><strong>Team:</strong> ${safeTeam}</p>` : ''}
        <p><strong>Contact:</strong> ${safeContact}</p>
        <p><strong>Type:</strong> ${escapeHtml(typeLabel)}</p>
      </div>
      <div style="padding: 20px; border-left: 4px solid #0066cc;">
        <h3 style="margin-top: 0;">Message:</h3>
        <p style="white-space: pre-wrap;">${safeMessage}</p>
        ${safePlayers ? `<p><strong>Players:</strong> ${safePlayers}</p>` : ''}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #666; font-size: 12px;">
        Sent from the message form on the 717REC home page. It is also waiting in
        the admin Contact Inbox.
      </p>
    </div>
  `;

  return await sendAdminEmail({
    from: '717REC League <noreply@717rec.com>',
    subject: `[717REC] ${typeLabel} from ${cleanName}`,
    html,
    logLabel: '[ContactRequest]',
  });
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
