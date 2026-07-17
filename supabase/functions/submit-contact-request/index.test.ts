import 'https://deno.land/std@0.224.0/dotenv/load.ts';

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);

import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { handleRequest, setRateLimiter } from './index.ts';

const validPayload = {
  request_type: 'general',
  submitter_name: 'Alice',
  submitter_contact: 'alice@example.com',
  message: 'Can someone follow up?',
};

function makeReq(body: unknown): Request {
  return new Request('http://localhost/submit-contact-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

const originalFetch = globalThis.fetch;
function stubFetch() {
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/rest/v1/contact_requests')) {
      return Promise.resolve(new Response('[]', { status: 201 }));
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  }) as typeof fetch;
}
function restoreFetch() {
  globalThis.fetch = originalFetch;
}
function allowAll() {
  setRateLimiter(() => Promise.resolve({ allowed: true, error: null }));
}
function reset() {
  setRateLimiter(null);
}

Deno.test({
  name: 'missing submitter_contact returns 400 with field message',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const { submitter_contact: _omit, ...body } = validPayload;
      const res = await handleRequest(makeReq(body));
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json.error, 'Invalid request');
      assertExists(json.issues.submitter_contact);
    } finally {
      restoreFetch();
      reset();
    }
  },
});
