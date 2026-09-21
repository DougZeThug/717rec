import 'https://deno.land/std@0.224.0/dotenv/load.ts';

// Provide required env BEFORE importing the function under test so
// createClient() inside requireAdmin() doesn't throw.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set('SUPABASE_ANON_KEY', Deno.env.get('SUPABASE_ANON_KEY') ?? 'test-anon-key');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);
Deno.env.delete('ANTHROPIC_API_KEY'); // never reach the model from a test

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleRequest, setRateLimiter } from './index.ts';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';

/** The smallest payload PayloadSchema accepts, so a test reaches the model check. */
const validPayload = {
  kind: 'caption',
  facts: {
    seasonName: 'Fall 2026',
    weekNumber: 6,
    upsets: [],
    hotStreaks: [],
    teamOfTheWeek: null,
    risers: [],
    divisionLeaders: [],
  },
};

function makeReq(body: unknown = validPayload): Request {
  return new Request('http://localhost/generate-recap-caption', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

function allowAll() {
  setRateLimiter(() => Promise.resolve({ allowed: true, error: null }));
}
function denyAll() {
  setRateLimiter(() => Promise.resolve({ allowed: false, error: null }));
}
function reset() {
  setRateLimiter(null);
}

// Stub the two lookups requireAdmin makes, so no real network call happens.
const originalFetch = globalThis.fetch;

function stubFetch({ isAdmin = true, rpcAllows = true } = {}) {
  const json = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    );

  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    // auth.getUser(jwt) -> GET /auth/v1/user; the body IS the user object.
    if (url.includes('/auth/v1/user')) {
      return json({ id: ADMIN_ID, aud: 'authenticated', email: 'admin@example.com' });
    }
    // .maybeSingle() on a GET returns an ARRAY; postgrest-js unwraps [0].
    if (url.includes('/rest/v1/profiles')) {
      return json([{ is_admin: isAdmin }]);
    }
    // check_rate_limit returns a bare boolean: true means "under the cap".
    if (url.includes('/rest/v1/rpc/check_rate_limit')) {
      return json(rpcAllows);
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  }) as typeof fetch;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

/**
 * The regression this file exists for. The limiter used to be called with four
 * loose values instead of (client, options), so it threw on client.rpc and the
 * whole function answered 500 -- on every request, from every admin.
 */
Deno.test({
  name: 'an allowed admin request gets past both rate limits',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq());
      // 503 is the unconfigured-model answer, which only the code *after* both
      // rate limits can produce. Anything else means a guard swallowed it.
      assertEquals(res.status, 503);
      const body = await res.json();
      assertEquals(body.code, 'caption_unconfigured');
    } finally {
      restoreFetch();
      reset();
    }
  },
});

/**
 * The seam the other tests use hides half the bug, because a stub ignores its
 * arguments. This one runs the real checkRateLimit against a stubbed RPC, so it
 * fails if the limiter is ever handed something that is not a Supabase client.
 */
Deno.test({
  name: 'the real rate limiter is called with a client that can reach the RPC',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    reset(); // no seam: the genuine checkRateLimit runs
    stubFetch({ rpcAllows: true });
    try {
      const res = await handleRequest(makeReq());
      assertEquals(res.status, 503);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'the real rate limiter refuses once the RPC says the cap is spent',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    reset();
    stubFetch({ rpcAllows: false });
    try {
      const res = await handleRequest(makeReq());
      assertEquals(res.status, 429);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

/**
 * The second half of the same bug: the limiter answers with an object, and
 * `if (!result)` on an object is never true, so this reply was unreachable.
 */
Deno.test({
  name: 'rate limit exceeded returns 429',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    denyAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq());
      assertEquals(res.status, 429);
      const body = await res.json();
      assertEquals(body.error, 'Too many requests. Wait a minute and try again.');
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'a non-admin is refused before the rate limit is spent',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    let limiterCalls = 0;
    setRateLimiter(() => {
      limiterCalls += 1;
      return Promise.resolve({ allowed: true, error: null });
    });
    stubFetch({ isAdmin: false });
    try {
      const res = await handleRequest(makeReq());
      assertEquals(res.status, 403);
      assertEquals(limiterCalls, 0);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test('OPTIONS is answered without touching auth or the rate limit', async () => {
  const res = await handleRequest(
    new Request('http://localhost/generate-recap-caption', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000' },
    })
  );
  assertEquals(res.status, 204);
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000');
});

Deno.test('a GET is refused as method not allowed', async () => {
  const res = await handleRequest(
    new Request('http://localhost/generate-recap-caption', { method: 'GET' })
  );
  assertEquals(res.status, 405);
});
