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
  setRateLimiter(async () => ({ allowed: true, error: null }));
}
function denyAll() {
  setRateLimiter(async () => ({ allowed: false, error: null }));
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
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'stub' }), { status: 200 })
      );
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

Deno.test('rejects malformed JSON with 400', async () => {
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
});

Deno.test('rejects payload missing required field with 400', async () => {
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
});

Deno.test('rejects invalid email with 400', async () => {
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
});

Deno.test('rejects subject not in allowlist with 400', async () => {
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
});

Deno.test('rejects field exceeding max length with 400', async () => {
  allowAll();
  stubFetch();
  try {
    const res = await handleRequest(
      makeReq({ ...validPayload, message: 'a'.repeat(5001) })
    );
    assertEquals(res.status, 400);
    const body = await res.json();
    assertExists(body.issues.message);
  } finally {
    restoreFetch();
    reset();
  }
});

Deno.test('rejects unknown extra fields (strict schema) with 400', async () => {
  allowAll();
  stubFetch();
  try {
    const res = await handleRequest(
      makeReq({ ...validPayload, evilField: 'sneaky' })
    );
    assertEquals(res.status, 400);
  } finally {
    restoreFetch();
    reset();
  }
});

Deno.test('honeypot field returns silent 200', async () => {
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
});

Deno.test('valid payload succeeds with 200', async () => {
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
});

Deno.test('rate limit exceeded returns 429', async () => {
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
});