import 'https://deno.land/std@0.224.0/dotenv/load.ts';

// Provide required env BEFORE importing the function under test so
// createClient() inside handleRequest() doesn't throw.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

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
      const requestUrl = new URL(url);
      const eqValue = (param: string): string | null => {
        const raw = requestUrl.searchParams.get(param);
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

// ─── CORS allowlist ───────────────────────────────────────────────────────────
// An origin that is not on the list gets no Access-Control-Allow-Origin header
// at all (not a 403), so the browser blocks the call and the app only ever sees
// "Failed to fetch". The dev server runs on 8080 (vite.config.ts), and its
// absence from this list broke the feature for everyone running from source.
// These cases exist so the list cannot silently drift from the dev port again.
function makePreflight(origin: string): Request {
  return new Request('http://localhost/submit-score-report', {
    method: 'OPTIONS',
    headers: { origin },
  });
}

Deno.test({
  name: 'preflight from the dev server origin is allowed',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await handleRequest(makePreflight('http://localhost:8080'));
    assertEquals(res.headers.get('access-control-allow-origin'), 'http://localhost:8080');
  },
});

Deno.test({
  name: 'preflight from an unlisted origin gets no allow-origin header',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await handleRequest(makePreflight('https://not-the-league.example'));
    assertEquals(res.headers.get('access-control-allow-origin'), null);
  },
});

// ─── Request flow ─────────────────────────────────────────────────────────────
// These cases pin the order of checks and the exact responses of the whole
// flow: method, rate limit, JSON, schema, honeypot, match lookup, optional
// sign-in lookup, duplicate pre-check and insert. The endpoint is public and
// uses the service-role key, so the order is part of its safety.

interface LoggedRequest {
  method: string;
  url: string;
  body: unknown;
  authorization: string | null;
}

interface FlowStub {
  /** Every request the function sent to the database / auth API, in order. */
  log: LoggedRequest[];
  /** Rows posted to score_submissions. */
  inserted: Record<string, unknown>[];
}

interface FlowConfig {
  /** Rows returned for the match lookup. Default: the match exists. */
  matches?: unknown[];
  matchesStatus?: number;
  /** Auth API user lookup. Default: no user (401). */
  user?: { id: string } | null;
  profile?: { id: string; username: string | null; full_name: string | null } | null;
  membership?: { team_id: string; is_approved: boolean; team: { id: string; name: string } } | null;
  /** Status for the duplicate pre-check. Default 200 with no existing row. */
  dedupeStatus?: number;
  existingPending?: boolean;
  /** Postgres error code to fail the insert with. */
  insertErrorCode?: string;
  insertErrorStatus?: number;
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFlow(config: FlowConfig = {}): FlowStub {
  const stub: FlowStub = { log: [], inserted: [] };
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = new Headers(init?.headers);
    const rawBody = typeof init?.body === 'string' ? init.body : null;
    stub.log.push({
      method,
      url,
      body: rawBody ? JSON.parse(rawBody) : null,
      authorization: headers.get('authorization'),
    });

    if (url.includes('/auth/v1/user')) {
      return Promise.resolve(
        config.user
          ? jsonRes({
              id: config.user.id,
              aud: 'authenticated',
              app_metadata: {},
              user_metadata: {},
            })
          : jsonRes({ message: 'invalid JWT' }, 401)
      );
    }
    if (url.includes('/rest/v1/matches')) {
      return Promise.resolve(
        jsonRes(config.matches ?? [{ id: MATCH_ID }], config.matchesStatus ?? 200)
      );
    }
    if (url.includes('/rest/v1/profiles')) {
      return Promise.resolve(jsonRes(config.profile ? [config.profile] : []));
    }
    if (url.includes('/rest/v1/team_memberships')) {
      return Promise.resolve(jsonRes(config.membership ? [config.membership] : []));
    }
    if (url.includes('/rest/v1/score_submissions')) {
      if (method === 'POST') {
        if (config.insertErrorCode) {
          return Promise.resolve(
            jsonRes(
              { code: config.insertErrorCode, message: 'stub error', details: null, hint: null },
              config.insertErrorStatus ?? 409
            )
          );
        }
        stub.inserted.push(JSON.parse(rawBody ?? '{}'));
        return Promise.resolve(new Response('[]', { status: 201 }));
      }
      if (config.dedupeStatus && config.dedupeStatus !== 200) {
        return Promise.resolve(
          jsonRes(
            { code: 'XX000', message: 'stub error', details: null, hint: null },
            config.dedupeStatus
          )
        );
      }
      return Promise.resolve(jsonRes(config.existingPending ? [{ id: 'existing-1' }] : []));
    }
    return Promise.resolve(new Response('[]', { status: 200 }));
  }) as typeof fetch;
  return stub;
}

/** Runs one scenario with the rate limiter open and fetch stubbed. */
async function runFlow(
  req: Request,
  config: FlowConfig = {}
): Promise<{ res: Response; body: Record<string, unknown> | null; stub: FlowStub }> {
  allowAll();
  const stub = stubFlow(config);
  try {
    const res = await handleRequest(req);
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : null, stub };
  } finally {
    restoreFetch();
    resetLimiter();
  }
}

const tablesHit = (stub: FlowStub) =>
  stub.log.map((request) => {
    const apiMatch = request.url.match(/\/(?:rest|auth)\/v1\/([a-z_]+)/);
    return `${request.method} ${apiMatch ? apiMatch[1] : request.url}`;
  });

Deno.test({
  name: 'GET is rejected with 405 and touches nothing',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(
      new Request('http://localhost/submit-score-report', {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      })
    );
    assertEquals(res.status, 405);
    assertEquals(body, { error: 'Method not allowed' });
    assertEquals(res.headers.get('content-type'), 'application/json');
    assertEquals(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assertEquals(stub.log.length, 0);
  },
});

Deno.test({
  name: 'preflight answers 200 with the allowed methods and headers, and touches nothing',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, stub } = await runFlow(makePreflight('http://localhost:3000'));
    assertEquals(res.status, 200);
    assertEquals(res.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
    assertEquals(
      res.headers.get('access-control-allow-headers'),
      'authorization, x-client-info, apikey, content-type'
    );
    assertEquals(res.headers.get('vary'), 'Origin');
    assertEquals(stub.log.length, 0);
  },
});

Deno.test({
  name: 'rate limited requests get 429 before any database call',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    setRateLimiter(() => Promise.resolve({ allowed: false, error: null }));
    const stub = stubFlow();
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 429);
      assertEquals(await res.json(), { error: 'Too many requests. Please try again later.' });
      assertEquals(stub.log.length, 0);
    } finally {
      restoreFetch();
      resetLimiter();
    }
  },
});

Deno.test({
  name: 'rate limiter is asked with the endpoint key, a 10 minute window and 5 hits',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    let seen: Record<string, unknown> | null = null;
    setRateLimiter((_client, opts) => {
      seen = opts as unknown as Record<string, unknown>;
      return Promise.resolve({ allowed: true, error: null });
    });
    stubFlow();
    try {
      await handleRequest(makeReq(validPayload));
      assert(seen !== null);
      const opts = seen as Record<string, unknown>;
      assertEquals(opts.endpoint, 'submit-score-report');
      assertEquals(opts.windowSeconds, 600);
      assertEquals(opts.maxHits, 5);
      assert(typeof opts.ipHash === 'string' && (opts.ipHash as string).length === 64);
    } finally {
      restoreFetch();
      resetLimiter();
    }
  },
});

Deno.test({
  name: 'a rate limiter error does not block the request when it still allows it',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    setRateLimiter(() => Promise.resolve({ allowed: true, error: 'db down' }));
    const stub = stubFlow();
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      assertEquals(stub.inserted.length, 1);
    } finally {
      restoreFetch();
      resetLimiter();
    }
  },
});

Deno.test({
  name: 'invalid JSON gets 400 and touches nothing',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq('{not json'));
    assertEquals(res.status, 400);
    assertEquals(body, { error: 'Invalid JSON body' });
    assertEquals(stub.log.length, 0);
  },
});

Deno.test({
  name: 'schema errors get 400 with the field issues and touch nothing',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const bad: Array<[string, unknown, string]> = [
      ['missing message', { ...validPayload, message: undefined }, 'message'],
      ['blank message', { ...validPayload, message: '   ' }, 'message'],
      ['message too long', { ...validPayload, message: 'x'.repeat(2001) }, 'message'],
      ['blank name', { ...validPayload, submitter_name: '  ' }, 'submitter_name'],
      ['name too long', { ...validPayload, submitter_name: 'x'.repeat(121) }, 'submitter_name'],
      ['team too long', { ...validPayload, submitter_team: 'x'.repeat(121) }, 'submitter_team'],
      ['not a uuid', { ...validPayload, match_id: 'nope' }, 'match_id'],
      ['honeypot too long', { ...validPayload, website: 'x'.repeat(501) }, 'website'],
    ];
    for (const [label, payload, field] of bad) {
      const { res, body, stub } = await runFlow(makeReq(payload));
      assertEquals(res.status, 400, label);
      assertEquals(body?.error, 'Invalid request', label);
      const issues = body?.issues as Record<string, string[]>;
      assert(Array.isArray(issues[field]), `${label}: issue for ${field}`);
      assertEquals(stub.log.length, 0, label);
    }
  },
});

Deno.test({
  name: 'an unknown key is rejected (strict schema)',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq({ ...validPayload, extra: 'x' }));
    assertEquals(res.status, 400);
    assertEquals(body?.error, 'Invalid request');
    assertEquals(stub.log.length, 0);
  },
});

Deno.test({
  name: 'a filled honeypot gets a silent 200 and nothing is read or written',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq({ ...validPayload, website: 'http://spam' }));
    assertEquals(res.status, 200);
    assertEquals(body, { success: true });
    assertEquals(stub.log.length, 0);
  },
});

Deno.test({
  name: 'a blank honeypot is ignored and the report is saved',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq({ ...validPayload, website: '   ' }));
    assertEquals(res.status, 200);
    assertEquals(body, { success: true });
    assertEquals(stub.inserted.length, 1);
  },
});

Deno.test({
  name: 'a match lookup error gets 500 and nothing is inserted',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq(validPayload), {
      matches: [],
      matchesStatus: 500,
    });
    assertEquals(res.status, 500);
    assertEquals(body, { error: 'Failed to verify match' });
    assertEquals(stub.inserted.length, 0);
    assertEquals(tablesHit(stub), ['GET matches']);
  },
});

Deno.test({
  name: 'an unknown match gets 404 and nothing is inserted',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq(validPayload), { matches: [] });
    assertEquals(res.status, 404);
    assertEquals(body, { error: 'Match not found' });
    assertEquals(tablesHit(stub), ['GET matches']);
  },
});

Deno.test({
  name: 'an anonymous report is saved as typed, unverified, in the expected order',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(
      makeReq({
        match_id: MATCH_ID,
        submitter_name: '  Alice  ',
        submitter_team: '  Alpha ',
        message: '  Alpha beat Beta 21-17 ',
      })
    );
    assertEquals(res.status, 200);
    assertEquals(body, { success: true });
    assertEquals(res.headers.get('content-type'), 'application/json');
    assertEquals(stub.inserted, [
      {
        match_id: MATCH_ID,
        submitter_name: 'Alice',
        submitter_team: 'Alpha',
        message: 'Alpha beat Beta 21-17',
        user_id: null,
        team_id: null,
        is_verified: false,
      },
    ]);
    assertEquals(tablesHit(stub), [
      'GET matches',
      'GET score_submissions',
      'POST score_submissions',
    ]);
  },
});

Deno.test({
  name: 'a missing or null typed team is saved as null',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const omitted = await runFlow(
      makeReq({ match_id: MATCH_ID, submitter_name: 'Alice', message: 'm1' })
    );
    assertEquals(omitted.stub.inserted[0].submitter_team, null);

    const explicitNull = await runFlow(
      makeReq({ match_id: MATCH_ID, submitter_name: 'Alice', submitter_team: null, message: 'm2' })
    );
    assertEquals(explicitNull.stub.inserted[0].submitter_team, null);
  },
});

Deno.test({
  name: 'a signed-in report uses the verified name and team and records user and team ids',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, stub } = await runFlow(
      makeReq(validPayload, { headers: { Authorization: 'Bearer good-token' } }),
      {
        user: { id: 'user-1' },
        profile: { id: 'user-1', username: 'ali', full_name: 'Alice Verified' },
        membership: {
          team_id: 'team-9',
          is_approved: true,
          team: { id: 'team-9', name: 'Verified Team' },
        },
      }
    );
    assertEquals(res.status, 200);
    assertEquals(stub.inserted, [
      {
        match_id: MATCH_ID,
        submitter_name: 'Alice Verified',
        submitter_team: 'Verified Team',
        message: 'Alpha beat Beta 21-17',
        user_id: 'user-1',
        team_id: 'team-9',
        is_verified: true,
      },
    ]);
    assertEquals(tablesHit(stub), [
      'GET matches',
      'GET user',
      'GET profiles',
      'GET team_memberships',
      'GET score_submissions',
      'POST score_submissions',
    ]);
    assertEquals(stub.log[1].authorization, 'Bearer good-token');
  },
});

Deno.test({
  name: 'the dedupe check uses the verified name, not the typed one',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { stub } = await runFlow(
      makeReq(validPayload, { headers: { Authorization: 'Bearer good-token' } }),
      {
        user: { id: 'user-1' },
        profile: { id: 'user-1', username: 'ali', full_name: 'Alice Verified' },
      }
    );
    const dedupe = stub.log.find(
      (request) => request.method === 'GET' && request.url.includes('score_submissions')
    );
    if (!dedupe) throw new Error('no duplicate pre-check request was sent');
    const dedupeUrl = new URL(dedupe.url);
    assertEquals(dedupeUrl.searchParams.get('match_id'), `eq.${MATCH_ID}`);
    assertEquals(dedupeUrl.searchParams.get('status'), 'eq.pending');
    assertEquals(dedupeUrl.searchParams.get('message'), 'eq.Alpha beat Beta 21-17');
    assertEquals(dedupeUrl.searchParams.get('submitter_name'), 'eq.Alice Verified');
    assertEquals(dedupeUrl.searchParams.get('limit'), '1');
  },
});

Deno.test({
  name: 'a verified name falls back to the username, then to the typed name',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const auth = { headers: { Authorization: 'Bearer good-token' } };

    const usernameOnly = await runFlow(makeReq(validPayload, auth), {
      user: { id: 'user-1' },
      profile: { id: 'user-1', username: 'ali', full_name: null },
    });
    assertEquals(usernameOnly.stub.inserted[0].submitter_name, 'ali');
    assertEquals(usernameOnly.stub.inserted[0].is_verified, true);

    const noProfile = await runFlow(makeReq(validPayload, auth), {
      user: { id: 'user-1' },
      profile: null,
    });
    assertEquals(noProfile.stub.inserted[0].submitter_name, 'Alice');
    assertEquals(noProfile.stub.inserted[0].user_id, 'user-1');
    assertEquals(noProfile.stub.inserted[0].is_verified, true);
  },
});

Deno.test({
  name: 'a signed-in user with no approved team keeps the typed team and has no team id',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { stub } = await runFlow(
      makeReq(validPayload, { headers: { Authorization: 'Bearer good-token' } }),
      { user: { id: 'user-1' }, profile: { id: 'user-1', username: null, full_name: 'Alice V' } }
    );
    assertEquals(stub.inserted[0].submitter_team, 'Alpha');
    assertEquals(stub.inserted[0].team_id, null);
    assertEquals(stub.inserted[0].user_id, 'user-1');
  },
});

Deno.test({
  name: 'a membership without a team name keeps the typed team but records the team id',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { stub } = await runFlow(
      makeReq(validPayload, { headers: { Authorization: 'Bearer good-token' } }),
      {
        user: { id: 'user-1' },
        profile: { id: 'user-1', username: 'ali', full_name: 'Alice V' },
        membership: {
          team_id: 'team-9',
          is_approved: true,
          team: null as unknown as { id: string; name: string },
        },
      }
    );
    assertEquals(stub.inserted[0].submitter_team, 'Alpha');
    assertEquals(stub.inserted[0].team_id, 'team-9');
  },
});

Deno.test({
  name: 'a bad token saves the report as unverified',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, stub } = await runFlow(
      makeReq(validPayload, { headers: { Authorization: 'Bearer bad-token' } }),
      { user: null }
    );
    assertEquals(res.status, 200);
    assertEquals(stub.inserted[0].is_verified, false);
    assertEquals(stub.inserted[0].user_id, null);
    assertEquals(stub.inserted[0].submitter_name, 'Alice');
    assertEquals(tablesHit(stub), [
      'GET matches',
      'GET user',
      'GET score_submissions',
      'POST score_submissions',
    ]);
  },
});

Deno.test({
  name: 'an Authorization header that is not a Bearer token is ignored',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { stub } = await runFlow(
      makeReq(validPayload, { headers: { Authorization: 'Basic abc' } }),
      { user: { id: 'user-1' } }
    );
    assertEquals(stub.inserted[0].is_verified, false);
    assert(!tablesHit(stub).includes('GET user'));
  },
});

Deno.test({
  name: 'a failed duplicate pre-check does not block the insert',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq(validPayload), { dedupeStatus: 500 });
    assertEquals(res.status, 200);
    assertEquals(body, { success: true });
    assertEquals(stub.inserted.length, 1);
  },
});

Deno.test({
  name: 'an existing pending report returns duplicate success without an insert',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body, stub } = await runFlow(makeReq(validPayload), { existingPending: true });
    assertEquals(res.status, 200);
    assertEquals(body, { success: true, duplicate: true });
    assertEquals(stub.inserted.length, 0);
    assertEquals(tablesHit(stub), ['GET matches', 'GET score_submissions']);
  },
});

Deno.test({
  name: 'an insert unique_violation returns duplicate success',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body } = await runFlow(makeReq(validPayload), { insertErrorCode: '23505' });
    assertEquals(res.status, 200);
    assertEquals(body, { success: true, duplicate: true });
  },
});

Deno.test({
  name: 'any other insert error gets 500',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res, body } = await runFlow(makeReq(validPayload), {
      insertErrorCode: '42501',
      insertErrorStatus: 403,
    });
    assertEquals(res.status, 500);
    assertEquals(body, { error: 'Failed to save score report' });
  },
});

Deno.test({
  name: 'a fresh submission response has no duplicate key',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { body } = await runFlow(makeReq(validPayload));
    assertEquals(body, { success: true });
    assert(body !== null && !('duplicate' in body));
  },
});

Deno.test({
  name: 'responses carry the security headers and Vary: Origin',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { res } = await runFlow(makeReq(validPayload));
    assertEquals(res.headers.get('vary'), 'Origin');
    assertEquals(res.headers.get('x-content-type-options'), 'nosniff');
  },
});
