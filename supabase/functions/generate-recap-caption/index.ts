import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.71.0';

import { requireAdmin } from '../_shared/auth.ts';
import { checkRateLimit as defaultCheckRateLimit } from '../_shared/rateLimit.ts';
import { SECURITY_HEADERS } from '../_shared/securityHeaders.ts';
import {
  BlurbReplySchema,
  type CaptionPayload,
  extractJsonArray,
  keepKnownTeams,
  PayloadSchema,
  type RankingsPayload,
  RankingsPayloadSchema,
} from './payload.ts';
import {
  buildCaptionUserMessage,
  buildRankingsUserMessage,
  CAPTION_SYSTEM_PROMPT,
  RANKINGS_SYSTEM_PROMPT,
} from './prompt.ts';

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

function jsonResponse(cors: Record<string, string>, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/**
 * Claude Opus 5. Adaptive thinking is on by default on this model and its
 * tokens count against max_tokens, so the cap has headroom well beyond the
 * ~350 tokens a caption needs — a lowballed cap truncates mid-sentence, and
 * billing is on tokens actually used, so the headroom costs nothing.
 */
const MODEL = 'claude-opus-5';
const MAX_TOKENS = 4000;
/**
 * Twenty-six one-sentence blurbs are only ~700 tokens of output, but thinking
 * tokens count against the same cap on this model and a whole-league
 * comparison is more to think about than one caption. Billing is on tokens
 * actually used, so the headroom costs nothing and a truncated reply costs a
 * whole regeneration.
 */
const RANKINGS_MAX_TOKENS = 16000;

async function handleRequest(req: Request): Promise<Response> {
  const cors = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return jsonResponse(cors, 405, { error: 'Method not allowed' });
  }

  const auth = await requireAdmin(req, cors);
  if (!auth.ok) return auth.response;

  // Keyed on the admin, not the IP: two admins in the same room share an IP,
  // and throttling one because the other generated a caption would be wrong.
  const accidentGuard = await rateLimiterImpl('generate-recap-caption', auth.ctx.userId, 5, 60);
  if (!accidentGuard) {
    return jsonResponse(cors, 429, { error: 'Too many requests. Wait a minute and try again.' });
  }
  const spendCap = await rateLimiterImpl(
    'generate-recap-caption-daily',
    auth.ctx.userId,
    100,
    86400
  );
  if (!spendCap) {
    return jsonResponse(cors, 429, { error: 'Daily caption limit reached.' });
  }

  // One function, two jobs: a week's caption and the whole league's power
  // ranking blurbs. They share this admin check, these rate limits, the model
  // config and the error handling, so a second function would be a copy of all
  // of it. `kind` defaults to 'caption' so existing callers are unaffected.
  let payload: CaptionPayload | RankingsPayload;
  try {
    const body = await req.json();
    payload =
      (body as { kind?: string })?.kind === 'rankings'
        ? RankingsPayloadSchema.parse(body)
        : PayloadSchema.parse(body);
  } catch {
    return jsonResponse(cors, 400, { error: 'Invalid request' });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    // 503 with a distinguishable code, not 500. The admin screen tells "not set
    // up" apart from "broken", and says which so somebody can fix it.
    return jsonResponse(cors, 503, {
      error: 'Caption generation is not configured',
      code: 'caption_unconfigured',
    });
  }

  // Built here, where `payload.kind` still narrows the union — a boolean flag
  // read further down would leave payload.facts as the union and the wrong
  // message builder would typecheck.
  const request =
    payload.kind === 'rankings'
      ? {
          maxTokens: RANKINGS_MAX_TOKENS,
          system: RANKINGS_SYSTEM_PROMPT,
          content: buildRankingsUserMessage(payload.facts, payload.commissionerNote, payload.tone),
        }
      : {
          maxTokens: MAX_TOKENS,
          system: CAPTION_SYSTEM_PROMPT,
          content: buildCaptionUserMessage(payload.facts, payload.commissionerNote, payload.tone),
        };
  const isRankings = payload.kind === 'rankings';

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: request.maxTokens,
      // A caption is a simple task. Do NOT disable thinking on this model —
      // with it off, tool-call text and <thinking> tags can leak into the reply.
      output_config: { effort: 'low' },
      system: request.system,
      messages: [{ role: 'user', content: request.content }],
    });

    // Check why it stopped before reading the text. A caption cut off at the
    // token cap must never be shipped as if it were finished.
    if (response.stop_reason === 'max_tokens') {
      return jsonResponse(cors, 502, {
        error: isRankings
          ? 'The blurbs came back unfinished. Try again.'
          : 'The caption came back unfinished. Try again.',
        code: isRankings ? 'blurbs_truncated' : 'caption_truncated',
      });
    }
    if (response.stop_reason === 'refusal') {
      return jsonResponse(cors, 502, {
        error: isRankings
          ? 'The blurbs could not be generated for this week.'
          : 'The caption could not be generated for this week.',
        code: isRankings ? 'blurbs_refused' : 'caption_refused',
      });
    }

    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (payload.kind === 'rankings') {
      const parsed = BlurbReplySchema.safeParse(extractJsonArray(text));
      if (!parsed.success) {
        return jsonResponse(cors, 502, {
          error: 'The blurbs came back in a shape we could not read. Try again.',
          code: 'blurbs_unreadable',
        });
      }

      // Only teams that were actually sent, so a reply cannot introduce one.
      const blurbs = keepKnownTeams(parsed.data, payload.facts.teams);
      if (Object.keys(blurbs).length === 0) {
        return jsonResponse(cors, 502, {
          error: 'The blurbs came back empty. Try again.',
          code: 'blurbs_empty',
        });
      }

      return jsonResponse(cors, 200, { blurbs, model: MODEL });
    }

    const caption = text;

    if (caption === '') {
      return jsonResponse(cors, 502, {
        error: 'The caption came back empty. Try again.',
        code: 'caption_empty',
      });
    }

    return jsonResponse(cors, 200, { caption, model: MODEL });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('generate-recap-caption failed:', message);
    return jsonResponse(cors, 502, {
      error: 'The caption service did not answer. Try again.',
      code: 'caption_failed',
    });
  }
}

export { handleRequest };

serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    console.error('[RecapCaption] Error:', error);
    return jsonResponse(buildCorsHeaders(req), 500, { error: 'Failed to process request' });
  }
});
