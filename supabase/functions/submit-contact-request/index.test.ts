import 'https://deno.land/std@0.224.0/dotenv/load.ts';

// Provide required env BEFORE importing the function under test so
// createClient() inside handleRequest() doesn't throw.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleRequest, setRateLimiter } from './index.ts';

function makeReq(body: unknown, init: RequestInit = {}): Request {
  return new Request('http://localhost/submit-contact-request', {
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
  request_type: 'general',
  submitter_name: 'Bob',
  submitter_contact: 'bob@example.com',
  message: 'Hi, can you help with a timeslot?',
};

function allowAll() {
  setRateLimiter(() => Promise.resolve({ allowed: true, error: null }));
}
function denyAll() {
  setRateLimiter(() => Promise.resolve({ allowed: false, error: null }));
}
function reset() {
  setRateLimiter(null);
}

// Stub the Supabase REST insert so no real network call happens.
const originalFetch = globalThis.fetch;
function stubFetch(opts: { insertOk?: boolean } = {}) {
  const insertOk = opts.insertOk ?? true;
  globalThis.fetch = ((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/rest/v1/contact_requests')) {
      return Promise.resolve(
        insertOk
          ? new Response('', { status: 201 })
          : new Response(JSON.stringify({ message: 'insert failed' }), { status: 500 })
      );
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  }) as typeof fetch;
}
function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test({
  name: 'rejects malformed JSON with 400',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq('not json'));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertEquals(body.error, 'Invalid JSON body');
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'missing submitter_contact → 400 with a field message (not a 500)',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const { submitter_contact: _omit, ...rest } = validPayload;
      const res = await handleRequest(makeReq(rest));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertEquals(body.error, 'Invalid request');
      assertExists(body.issues.submitter_contact);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'empty submitter_contact → 400 (min length enforced)',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, submitter_contact: '   ' }));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertExists(body.issues.submitter_contact);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'rejects unknown extra fields (strict schema) with 400',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, evilField: 'sneaky' }));
      assertEquals(res.status, 400);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'valid payload succeeds with 200',
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
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'rate limit exceeded returns 429 with Retry-After',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    denyAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 429);
      assertExists(res.headers.get('Retry-After'));
      const body = await res.json();
      assertEquals(body.error, 'Too many requests. Please try again later.');
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'response carries explicit security headers (CSP)',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertStringIncludes(res.headers.get('Content-Security-Policy') ?? '', "default-src 'none'");
      assertEquals(res.headers.get('X-Content-Type-Options'), 'nosniff');
      assertEquals(res.headers.get('X-Frame-Options'), 'DENY');
    } finally {
      restoreFetch();
      reset();
    }
  },
});
