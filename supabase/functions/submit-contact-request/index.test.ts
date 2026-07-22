import 'https://deno.land/std@0.190.0/dotenv/load.ts';

Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://localhost');
Deno.env.set(
  'SUPABASE_SERVICE_ROLE_KEY',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'test-service-key'
);
Deno.env.set('IP_HASH_SALT', Deno.env.get('IP_HASH_SALT') ?? 'test-ip-hash-salt');
Deno.env.set('SUPABASE_TRUSTED_PROXY_HOPS', Deno.env.get('SUPABASE_TRUSTED_PROXY_HOPS') ?? '1');

import { assertEquals, assertExists } from 'https://deno.land/std@0.190.0/assert/mod.ts';

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
      'x-forwarded-for': '203.0.113.10, 127.0.0.1',
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

Deno.test({
  name: 'blank submitter_contact returns 400 until the required UI field is filled',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    allowAll();
    stubFetch();
    try {
      const res = await handleRequest(makeReq({ ...validPayload, submitter_contact: '' }));
      assertEquals(res.status, 400);
      const json = await res.json();
      assertEquals(json.error, 'Invalid request');
    } finally {
      restoreFetch();
      reset();
    }
  },
});
