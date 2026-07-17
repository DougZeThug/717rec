import 'https://deno.land/std@0.224.0/dotenv/load.ts';

// Provide required env BEFORE importing the function under test so
// createClient() inside handleRequest() doesn't throw.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);
Deno.env.set('IP_HASH_SALT', Deno.env.get('IP_HASH_SALT') ?? 'test-ip-hash-salt');
Deno.env.set('SUPABASE_TRUSTED_PROXY_HOPS', Deno.env.get('SUPABASE_TRUSTED_PROXY_HOPS') ?? '1');

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleRequest, setRateLimiter } from './index.ts';

const MATCH_ID = '11111111-1111-4111-8111-111111111111';

function makeReq(body: unknown, init: RequestInit = {}): Request {
  return new Request('http://localhost/submit-score-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      origin: 'http://localhost:3000',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });
}

const validPayload = {
  match_id: MATCH_ID,
  submitter_name: 'Alice',
  submitter_team: 'Alpha',
  message: 'Alpha beat Beta 21-17',
};

function allowAll() {
  // setRateLimiter expects a Promise-returning callback; this test value is immediate.
  setRateLimiter(() => Promise.resolve({ allowed: true, error: null }));
}
function resetLimiter() {
  setRateLimiter(null);
}

// In-memory pending-submissions store shared by the fetch stub.
interface PendingRow {
  id: string;
  match_id: string;
  message: string;
  status: string;
}
let pending: PendingRow[] = [];
// If set, forces the next INSERT to fail with the given Postgres error code.
let nextInsertErrorCode: string | null = null;

const originalFetch = globalThis.fetch;

function stubFetch() {
  pending = [];
  nextInsertErrorCode = null;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();

    // Match existence check: always found.
    if (url.includes('/rest/v1/matches')) {
      return Promise.resolve(
        new Response(JSON.stringify([{ id: MATCH_ID }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    if (url.includes('/rest/v1/score_submissions')) {
      if (method === 'POST') {
        if (nextInsertErrorCode) {
          const code = nextInsertErrorCode;
          nextInsertErrorCode = null;
          return Promise.resolve(
            new Response(
              JSON.stringify({ code, message: 'stub error', details: null, hint: null }),
              { status: 409, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        const rows = JSON.parse((init?.body as string) ?? '[]');
        const list = Array.isArray(rows) ? rows : [rows];
        for (const r of list) {
          pending.push({
            id: crypto.randomUUID(),
            match_id: r.match_id,
            message: r.message,
            status: 'pending',
          });
        }
        return Promise.resolve(new Response('[]', { status: 201 }));
      }

      // Dedupe pre-check: parse match_id, status, message eq filters.
      const u = new URL(url);
      const eqValue = (param: string): string | null => {
        const raw = u.searchParams.get(param);
        if (!raw) return null;
        return raw.startsWith('eq.') ? decodeURIComponent(raw.slice(3)) : null;
      };
      const mMatch = eqValue('match_id');
      const mStatus = eqValue('status');
      const mMessage = eqValue('message');
      const hit = pending.find(
        (r) =>
          (!mMatch || r.match_id === mMatch) &&
          (!mStatus || r.status === mStatus) &&
          (!mMessage || r.message === mMessage)
      );
      return Promise.resolve(
        new Response(JSON.stringify(hit ? [{ id: hit.id }] : []), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    // Fall through — anything else (profiles, memberships) returns empty.
    return Promise.resolve(new Response('[]', { status: 200 }));
  }) as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test({
  name: 'first valid submission succeeds and inserts one row',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.duplicate);
      assertEquals(pending.length, 1);
    } finally {
      restoreFetch();
      resetLimiter();
    }
  },
});

Deno.test({
  name: 'duplicate identical submission returns success:true, duplicate:true and does not insert',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      await handleRequest(makeReq(validPayload));
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.duplicate, true);
      assertEquals(pending.length, 1);
    } finally {
      restoreFetch();
      resetLimiter();
    }
  },
});

Deno.test({
  name: 'distinct message inserts a second row',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      await handleRequest(makeReq(validPayload));
      const res = await handleRequest(
        makeReq({ ...validPayload, message: 'Alpha beat Beta 21-19' })
      );
      assertEquals(res.status, 200);
      assertEquals(pending.length, 2);
    } finally {
      restoreFetch();
      resetLimiter();
    }
  },
});

Deno.test({
  name: 'race — insert 23505 unique_violation is treated as duplicate success',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      // Pre-check misses (empty store) but the insert simulates the partial
      // unique index firing because a racing request landed first.
      nextInsertErrorCode = '23505';
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.duplicate, true);
    } finally {
      restoreFetch();
      resetLimiter();
    }
  },
});
