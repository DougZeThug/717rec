// Explicit, defense-in-depth security headers applied to every response these
// edge functions return.
//
// These endpoints serve JSON APIs (never HTML), so the strictest possible
// Content-Security-Policy is appropriate: forbid loading or framing of any
// resource. It is paired with the standard hardening headers.
//
// Usage: spread SECURITY_HEADERS into each function's base CORS header object
// so that every response — success, error, and OPTIONS preflight — carries
// them:
//
//   const headers = { ...SECURITY_HEADERS, 'Access-Control-Allow-Methods': ... };
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};
