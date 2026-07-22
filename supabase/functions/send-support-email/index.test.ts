import 'https://deno.land/std@0.224.0/dotenv/load.ts';

// Provide required env BEFORE importing the function under test so
// createClient() inside handleRequest() doesn't throw.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);
Deno.env.delete('RESEND_API_KEY'); // skip Resend branch in tests

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleRequest, setRateLimiter, stripControlChars } from './index.ts';

function makeReq(body: unknown, init: RequestInit = {}): Request {
  // Pull headers out of init first so the outer spread can't clobber the merged
  // default headers (Content-Type, x-forwarded-for, origin).
  const { headers: initHeaders, ...restInit } = init;
  return new Request('http://localhost/send-support-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      origin: 'http://localhost:3000',
      ...((initHeaders as Record<string, string> | undefined) ?? {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...restInit,
  });
}

const validPayload = {
  name: 'Alice',
  email: 'alice@example.com',
  subject: 'general_question',
  message: 'Hi, I have a question about my team.',
};

function allowAll() {
  // setRateLimiter expects a Promise-returning callback; this test value is immediate.
  setRateLimiter(() => Promise.resolve({ allowed: true, error: null }));
}
function denyAll() {
  // setRateLimiter expects a Promise-returning callback; this test value is immediate.
  setRateLimiter(() => Promise.resolve({ allowed: false, error: null }));
}
function reset() {
  setRateLimiter(null);
}

// Stub Resend + Supabase REST so no real network calls happen. Both outcomes
// (the support_tickets insert and the Resend send) are independently toggleable
// so we can exercise the store/email success matrix.
const originalFetch = globalThis.fetch;
function stubFetch(opts: { insertOk?: boolean; resendOk?: boolean } = {}) {
  const insertOk = opts.insertOk ?? true;
  const resendOk = opts.resendOk ?? true;
  globalThis.fetch = ((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('api.resend.com')) {
      return Promise.resolve(
        resendOk
          ? new Response(JSON.stringify({ id: 'stub' }), { status: 200 })
          : new Response('resend unavailable', { status: 500 })
      );
    }
    if (url.includes('/rest/v1/support_tickets')) {
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
  name: 'rejects payload missing required field with 400',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const { message: _omit, ...rest } = validPayload;
      const res = await handleRequest(makeReq(rest));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertEquals(body.error, 'Invalid request');
      assertExists(body.issues.message);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'rejects invalid email with 400',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, email: 'not-an-email' }));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertExists(body.issues.email);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'rejects subject not in allowlist with 400',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, subject: 'evil' }));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertExists(body.issues.subject);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'rejects field exceeding max length with 400',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, message: 'a'.repeat(5001) }));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertExists(body.issues.message);
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
  name: 'honeypot field returns silent 200',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, website: 'http://bot.test' }));
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
  name: 'rate limit exceeded returns 429',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    denyAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 429);
      const body = await res.json();
      assertEquals(body.error, 'Too many requests. Please try again later.');
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'store fails and email disabled → 502 (never a silent success)',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch({ insertOk: false }); // RESEND_API_KEY is deleted globally in this file
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 502);
      const body = await res.json();
      assertEquals(body.success, false);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'store fails and email fails → 502',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    stubFetch({ insertOk: false, resendOk: false });
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 502);
      const body = await res.json();
      assertEquals(body.success, false);
    } finally {
      restoreFetch();
      Deno.env.delete('RESEND_API_KEY');
      reset();
    }
  },
});

Deno.test({
  name: 'store succeeds but email fails → 200 with email-pending copy',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    stubFetch({ insertOk: true, resendOk: false });
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.stored, true);
      assertEquals(body.emailed, false);
    } finally {
      restoreFetch();
      Deno.env.delete('RESEND_API_KEY');
      reset();
    }
  },
});

Deno.test({
  name: 'store succeeds and email sends → 200 emailed:true',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    stubFetch({ insertOk: true, resendOk: true });
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.emailed, true);
    } finally {
      restoreFetch();
      Deno.env.delete('RESEND_API_KEY');
      reset();
    }
  },
});

Deno.test('stripControlChars removes CR/LF/NUL (subject-injection defense)', () => {
  assertEquals(stripControlChars('Alice\r\nBcc: evil@x.com'), 'AliceBcc: evil@x.com');
  assertEquals(stripControlChars('a\tb\tc'), 'abc'); // tabs stripped, spaces kept
  assertEquals(stripControlChars('normal name'), 'normal name');
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
