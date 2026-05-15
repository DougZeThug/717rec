import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

import {
  checkRateLimit as defaultCheckRateLimit,
  hashIp,
} from '../_shared/rateLimit.ts';

type RateLimitFn = typeof defaultCheckRateLimit;

// Test seam — overridable from tests via setRateLimiter().
let rateLimiterImpl: RateLimitFn = defaultCheckRateLimit;
export function setRateLimiter(fn: RateLimitFn | null): void {
  rateLimiterImpl = fn ?? defaultCheckRateLimit;
}


// Explicit CORS allowlist. Browsers enforce this; server-to-server callers are
// unaffected since they don't send Origin. Keep this list in sync with the
// app's published / preview / dev URLs.
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

const SUBJECT_LABELS: Record<string, string> = {
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  account_issue: 'Account Issue',
  score_dispute: 'Score Dispute',
  general_question: 'General Question',
  other: 'Other',
};

const SUBJECT_KEYS = [
  'bug_report',
  'feature_request',
  'account_issue',
  'score_dispute',
  'general_question',
  'other',
] as const;

const SupportSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.enum(SUBJECT_KEYS),
    message: z.string().trim().min(1).max(5000),
    website: z.string().max(500).optional(), // honeypot
  })
  .strict();

type SupportPayload = z.infer<typeof SupportSchema>;

// Rate limit: 5 submissions per IP per 10 minutes.
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
const RATE_LIMIT_MAX = 5;
const ENDPOINT_KEY = 'send-support-email';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}

function countUrls(text: string): number {
  const matches = text.match(/https?:\/\/|www\./gi);
  return matches ? matches.length : 0;
}

function jsonResponse(
  body: unknown,
  status: number,
  cors: Record<string, string>
): Response {
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
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Durable, cross-isolate rate limit (per endpoint + hashed IP).
  const rl = await rateLimiterImpl(supabase, {
    endpoint: ENDPOINT_KEY,
    ipHash,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    maxHits: RATE_LIMIT_MAX,
  });
  if (rl.error) {
    console.warn('[Support] rate-limit RPC error (failing open):', rl.error);
  }
  if (!rl.allowed) {
    console.warn('[Support] Rate limit exceeded for ip_hash:', ipHash);
    return jsonResponse(
      { error: 'Too many requests. Please try again later.' },
      429,
      corsHeaders
    );
  }

  // Parse JSON body defensively.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
  }

  const parsed = SupportSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { error: 'Invalid request', issues: parsed.error.flatten().fieldErrors },
      400,
      corsHeaders
    );
  }

  const payload: SupportPayload = parsed.data;

  // Honeypot: bots fill hidden fields. Silently succeed without sending email.
  if (payload.website && payload.website.trim().length > 0) {
    console.log('[Support] Honeypot triggered for ip_hash:', ipHash);
    return jsonResponse(
      { success: true, message: 'Message sent successfully' },
      200,
      corsHeaders
    );
  }

  // Spam signature: too many URLs in message.
  if (countUrls(payload.message) > 5) {
    console.warn('[Support] URL-spam blocked for ip_hash:', ipHash);
    return jsonResponse({ error: 'Message contains too many links' }, 400, corsHeaders);
  }

  // Best-effort store of the ticket. Will silently noop if table is missing.
  await supabase
    .from('support_tickets')
    .insert({
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      message: payload.message,
      status: 'new',
    })
    .single();

  if (!RESEND_API_KEY) {
    console.log('[Support] No Resend API key — ticket stored, email not sent');
    return jsonResponse({ success: true, message: 'Ticket received' }, 200, corsHeaders);
  }

  // Send email via Resend — escape all user inputs to prevent XSS.
  const subjectLabel = SUBJECT_LABELS[payload.subject] ?? escapeHtml(payload.subject);
  const safeName = escapeHtml(payload.name);
  const safeEmail = escapeHtml(payload.email);
  const safeMessage = escapeHtml(payload.message);
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Support Request</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>From:</strong> ${safeName}</p>
        <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p><strong>Subject:</strong> ${subjectLabel}</p>
      </div>
      <div style="padding: 20px; border-left: 4px solid #0066cc;">
        <h3 style="margin-top: 0;">Message:</h3>
        <p style="white-space: pre-wrap;">${safeMessage}</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #666; font-size: 12px;">
        This message was sent via the 717REC contact form.
      </p>
    </div>
  `;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: '717REC Support <noreply@717rec.com>',
      to: ['admin@717rec.com'],
      reply_to: payload.email,
      subject: `[717REC Support] ${subjectLabel} from ${safeName}`,
      html: emailHtml,
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    console.error('[Support] Resend API error:', errorText);
    return jsonResponse(
      { success: true, message: 'Ticket received (email pending)' },
      200,
      corsHeaders
    );
  }

  const resendData = (await resendResponse.json()) as { id?: string };
  console.log('[Support] Email sent successfully:', resendData.id);

  return jsonResponse(
    { success: true, message: 'Message sent successfully' },
    200,
    corsHeaders
  );
}

export { handleRequest };

serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('[Support] Error:', error);
    const corsHeaders = buildCorsHeaders(req);
    return jsonResponse({ error: 'Failed to process request' }, 500, corsHeaders);
  }
});
