import 'https://deno.land/std@0.224.0/dotenv/load.ts';

// Provide required env BEFORE importing the function under test so
// createClient() inside handleRequest() doesn't throw.
Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);
Deno.env.delete('RESEND_API_KEY'); // skip Resend branch unless a test opts in

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleRequest, setRateLimiter } from './index.ts';

function makeReq(body: unknown, init: RequestInit = {}): Request {
  // Pull headers out of init first so the outer spread can't clobber the merged
  // default headers (Content-Type, x-forwarded-for, origin).
  const { headers: initHeaders, ...restInit } = init;
  return new Request('http://localhost/submit-contact-request', {
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

// Stub the Supabase REST insert and the Resend send so no real network call
// happens. The two are independently toggleable: the insert is the durable
// record, the email is a best-effort alert on top of it.
const originalFetch = globalThis.fetch;
let lastResendBody: Record<string, unknown> | null = null;
function stubFetch(opts: { insertOk?: boolean; resendOk?: boolean } = {}) {
  const insertOk = opts.insertOk ?? true;
  const resendOk = opts.resendOk ?? true;
  lastResendBody = null;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('api.resend.com')) {
      if (typeof init?.body === 'string') {
        lastResendBody = JSON.parse(init.body) as Record<string, unknown>;
      }
      return Promise.resolve(
        resendOk
          ? new Response(JSON.stringify({ id: 'email-1' }), { status: 200 })
          : new Response('resend unavailable', { status: 500 })
      );
    }
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

Deno.test({
  name: 'emails the league when the request saves and Resend accepts it',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    stubFetch({ insertOk: true, resendOk: true });
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.emailed, true);

      const sent = lastResendBody;
      assertExists(sent);
      assertEquals(sent.to, ['admin@717rec.com']);
      assertStringIncludes(sent.subject as string, 'General message');
      assertStringIncludes(sent.subject as string, 'Bob');
      assertStringIncludes(sent.html as string, 'can you help with a timeslot');
    } finally {
      Deno.env.delete('RESEND_API_KEY');
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'still succeeds when the request saves but the email fails',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    // The row is already stored. A 500 here would make the client retry and
    // duplicate a request the league actually kept.
    stubFetch({ insertOk: true, resendOk: false });
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.emailed, false);
    } finally {
      Deno.env.delete('RESEND_API_KEY');
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'still succeeds with no Resend key configured, reporting emailed:false',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    allowAll();
    stubFetch({ insertOk: true });
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.emailed, false);
      assertEquals(lastResendBody, null);
    } finally {
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'does not email when the insert fails',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    stubFetch({ insertOk: false, resendOk: true });
    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 500);
      assertEquals(lastResendBody, null);
    } finally {
      Deno.env.delete('RESEND_API_KEY');
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'strips control characters from the name before it reaches the subject',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    stubFetch({ insertOk: true, resendOk: true });
    try {
      const res = await handleRequest(
        makeReq({ ...validPayload, submitter_name: 'Bob\nBcc: evil@example.com' })
      );
      assertEquals(res.status, 200);
      const sent = lastResendBody;
      assertExists(sent);
      const subject = sent.subject as string;
      assertEquals(subject.includes('\n'), false);
      assertEquals(subject.includes('\r'), false);
    } finally {
      Deno.env.delete('RESEND_API_KEY');
      restoreFetch();
      reset();
    }
  },
});

Deno.test({
  name: 'does not hang the response when the email send stalls',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    allowAll();
    Deno.env.set('RESEND_API_KEY', 'test-resend-key');
    const originalStub = globalThis.fetch;
    stubFetch({ insertOk: true });
    const afterInsert = globalThis.fetch;
    // Resend accepts the connection and then never answers. Without a bounded
    // wait this holds the response open until the client gives up and retries,
    // duplicating a request already stored.
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('api.resend.com')) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('timed out', 'TimeoutError'))
          );
        });
      }
      return afterInsert(input, init);
    }) as typeof fetch;

    try {
      const res = await handleRequest(makeReq(validPayload));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.emailed, false);
    } finally {
      globalThis.fetch = originalStub;
      Deno.env.delete('RESEND_API_KEY');
      restoreFetch();
      reset();
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
  return new Request('http://localhost/submit-contact-request', {
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
