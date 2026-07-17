import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

import { checkRateLimit, getClientIp, hashIp } from '../_shared/rateLimit.ts';
import { SECURITY_HEADERS } from '../_shared/securityHeaders.ts';

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

const UA_CLASSES = ['mobile-ios', 'mobile-android', 'mobile-other', 'desktop', 'unknown'] as const;

const PayloadSchema = z
  .object({
    path: z.string().trim().min(1).max(256),
    ua_class: z.enum(UA_CLASSES),
  })
  .strict();

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 60;
const ENDPOINT_KEY = 'pageview';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Hash `ip + user-agent + YYYY-MM-DD + salt` → 16-char hex. No PII stored;
 * the id rotates every UTC day so it cannot follow a user across days.
 */
export async function computeAnonDayId(
  ip: string,
  userAgent: string,
  salt: string,
  day: string = today()
): Promise<string> {
  const material = `${ip}|${userAgent}|${day}|${salt}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 16);
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export async function handleRequest(req: Request): Promise<Response> {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const PAGEVIEW_SALT = Deno.env.get('PAGEVIEW_SALT') ?? '';
  if (!PAGEVIEW_SALT) {
    console.error('[pageview] PAGEVIEW_SALT not configured');
    return jsonResponse({ error: 'Server misconfigured' }, 500, corsHeaders);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);

  const rl = await checkRateLimit(supabase, {
    endpoint: ENDPOINT_KEY,
    ipHash,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    maxHits: RATE_LIMIT_MAX,
  });
  if (rl.error) console.warn('[pageview] rate-limit error:', rl.error);
  if (!rl.allowed) return new Response(null, { status: 204, headers: corsHeaders });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
  }

  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'Invalid payload', issues: parsed.error.flatten().fieldErrors },
      400,
      corsHeaders
    );
  }

  const userAgent = req.headers.get('user-agent') ?? '';
  const anonDayId = await computeAnonDayId(ip, userAgent, PAGEVIEW_SALT);

  const { error: insertError } = await supabase.from('page_views').insert({
    path: parsed.data.path,
    ua_class: parsed.data.ua_class,
    anon_day_id: anonDayId,
  });

  if (insertError) {
    console.error('[pageview] insert error:', insertError);
    return jsonResponse({ error: 'Failed to record pageview' }, 500, corsHeaders);
  }

  return new Response(null, { status: 204, headers: corsHeaders });
}

serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('[pageview] Error:', error);
    const corsHeaders = buildCorsHeaders(req);
    return jsonResponse({ error: 'Failed to process request' }, 500, corsHeaders);
  }
});
