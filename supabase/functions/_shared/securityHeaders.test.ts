import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { SECURITY_HEADERS } from './securityHeaders.ts';

Deno.test('SECURITY_HEADERS defines a restrictive Content-Security-Policy', () => {
  const csp = SECURITY_HEADERS['Content-Security-Policy'];
  assertStringIncludes(csp, "default-src 'none'");
  assertStringIncludes(csp, "frame-ancestors 'none'");
  assertStringIncludes(csp, "base-uri 'none'");
});

Deno.test('SECURITY_HEADERS includes the standard hardening headers', () => {
  assertEquals(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
  assertEquals(SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assertEquals(SECURITY_HEADERS['Referrer-Policy'], 'no-referrer');
});
