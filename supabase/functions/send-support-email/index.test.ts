import 'https://deno.land/std@0.224.0/dotenv/load.ts';

// Provide required env BEFORE importing the function under test so
// createClient() inside handleRequest() doesn't throw.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);
Deno.env.set('IP_HASH_SALT', Deno.env.get('IP_HASH_SALT') ?? 'test-ip-hash-salt');
Deno.env.delete('RESEND_API_KEY'); // skip Resend branch in tests

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleRequest, setRateLimiter } from './index.ts';

function makeReq(body: unknown, init: RequestInit = {}): Request {
  return new Request('http://localhost/send-support-email', {
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

// Stub Resend + Supabase REST so no real network calls happen.
const originalFetch = globalThis.fetch;
function stubFetch() {
  globalThis.fetch = ((input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('api.resend.com')) {
      return Promise.resolve(new Response(JSON.stringify({ id: 'stub' }), { status: 200 }));
    }
    if (url.includes('supabase')) {
      // Insert into support_tickets — return empty success.
      return Promise.resolve(new Response('[]', { status: 200 }));
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

Deno.test({
  name: 'store fails and email fails returns 502',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    const previousKey = Deno.env.get('RESEND_API_KEY');
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    globalThis.fetch = ((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('api.resend.com')) {
        return Promise.resolve(new Response('resend failed', { status: 500 }));
      }
      if (url.includes('/rest/v1/support_tickets')) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'relation does not exist' }), {
            status: 500,
          })
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof fetch;
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 502);
      const body = await res.json();
      assertEquals(body.stored, false);
      assertEquals(body.emailed, false);
    } finally {
      if (previousKey === undefined) Deno.env.delete('RESEND_API_KEY');
      else Deno.env.set('RESEND_API_KEY', previousKey);
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'email subject strips control characters from name',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    const previousKey = Deno.env.get('RESEND_API_KEY');
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    let resendBody = '';
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('api.resend.com')) {
        resendBody = String(init?.body ?? '');
        return Promise.resolve(new Response(JSON.stringify({ id: 'stub' }), { status: 200 }));
      }
      if (url.includes('/rest/v1/support_tickets')) {
        return Promise.resolve(new Response('[]', { status: 201 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof fetch;
    try {
      const res = await handleRequest(
        makeReq({
          ...validPayload,
          name: 'Alice\r\nBcc: attacker@example.com',
        })
      );
      assertEquals(res.status, 200);
      const parsed = JSON.parse(resendBody);
      assertEquals(parsed.subject.includes('\r'), false);
      assertEquals(parsed.subject.includes('\n'), false);
    } finally {
      if (previousKey === undefined) Deno.env.delete('RESEND_API_KEY');
      else Deno.env.set('RESEND_API_KEY', previousKey);
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'control-only normalized name returns 400 before storage or email',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, name: '\u0000\u0001' }));
      assertEquals(res.status, 400);
      const body = await res.json();
      assertEquals(body.error, 'Invalid request');
      assertExists(body.issues.name);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'stored ticket plus Resend transport failure returns email pending success',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    const previousKey = Deno.env.get('RESEND_API_KEY');
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    globalThis.fetch = ((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('api.resend.com')) {
        return Promise.reject(new Error('network timeout'));
      }
      if (url.includes('/rest/v1/support_tickets')) {
        return Promise.resolve(new Response('[]', { status: 201 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    }) as typeof fetch;
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.stored, true);
      assertEquals(body.emailed, false);
    } finally {
      if (previousKey === undefined) Deno.env.delete('RESEND_API_KEY');
      else Deno.env.set('RESEND_API_KEY', previousKey);
      restoreFetch();
      reset();
    }
  },
});
