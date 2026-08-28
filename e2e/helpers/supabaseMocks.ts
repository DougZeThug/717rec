import type { Page, Route } from '@playwright/test';

/**
 * Shared Supabase stubbing for the regression specs.
 *
 * `src/integrations/supabase/client.ts` falls back to a hardcoded **production**
 * URL when no env vars are set, which is the case for `npm run dev` here. Every
 * spec must therefore intercept all Supabase traffic — `stubSupabase` installs a
 * catch-all first so nothing can escape, and callers layer more specific
 * handlers on top afterwards.
 */

/** Project ref baked into the client fallback; the auth storage key derives from it. */
const AUTH_STORAGE_KEY = 'sb-wcitdamvochthvxvtxyb-auth-token';

/**
 * supabase-js sends a preflight for every call, so a fulfilled response without
 * these headers is rejected by the browser before the app ever sees it.
 */
export const jsonResponse = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, prefer',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  },
  body: JSON.stringify(body),
});

/** Answer a preflight and report whether the real request still needs handling. */
const handledPreflight = async (route: Route) => {
  if (route.request().method() !== 'OPTIONS') return false;
  await route.fulfill(jsonResponse(null, 204));
  return true;
};

/**
 * Stub every Supabase URL family with empty, signed-out defaults.
 *
 * Playwright gives precedence to the most recently registered matching handler,
 * so the broad catch-all goes on first and anything a spec registers afterwards
 * wins. The catch-all is what guarantees no request reaches production.
 */
export const stubSupabase = async (page: Page) => {
  await page.route(/supabase\.co\//, async (route) => {
    if (await handledPreflight(route)) return;
    await route.fulfill(jsonResponse([]));
  });

  await page.route(/\/auth\/v1\//, async (route) => {
    if (await handledPreflight(route)) return;
    await route.fulfill(jsonResponse({ user: null }));
  });

  await page.route(/\/rest\/v1\//, async (route) => {
    if (await handledPreflight(route)) return;
    await route.fulfill(jsonResponse([]));
  });

  await page.route(/\/functions\/v1\//, async (route) => {
    if (await handledPreflight(route)) return;
    await route.fulfill(jsonResponse({ ok: true }));
  });
};

const makeUser = (id: string, email: string) => ({
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-06-22T00:00:00.000Z',
});

/**
 * Fake a signed-in admin.
 *
 * Both halves of the gate are client-side: ProtectedAdminRoute needs a session
 * (read from localStorage) and `profile.is_admin` (read over REST). Neither is
 * verified in the browser, which is what makes the admin screens reachable in a
 * spec. Set `tab` to deep-link a dashboard section without clicking through.
 */
export const seedAdminAuth = async (page: Page, options: { tab?: string } = {}) => {
  const user = makeUser('e2e-regression-admin', 'e2e-regression-admin@example.com');

  await page.addInitScript(
    ({ key, seededUser, tab }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          access_token: 'e2e-access-token',
          refresh_token: 'e2e-refresh-token',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: seededUser,
        })
      );
      if (tab) window.sessionStorage.setItem('adminActiveTab', tab);
      else window.sessionStorage.removeItem('adminActiveTab');
    },
    { key: AUTH_STORAGE_KEY, seededUser: user, tab: options.tab ?? null }
  );

  await page.route(/\/auth\/v1\/user/, async (route) => {
    if (await handledPreflight(route)) return;
    await route.fulfill(jsonResponse({ user }));
  });

  await page.route(/\/rest\/v1\/profiles/, async (route) => {
    if (await handledPreflight(route)) return;
    await route.fulfill(
      jsonResponse({
        id: user.id,
        username: 'e2e_regression_admin',
        full_name: 'E2E Regression Admin',
        avatar_url: null,
        created_at: '2026-06-22T00:00:00.000Z',
        is_admin: true,
      })
    );
  });

  await page.route(/\/rest\/v1\/rpc\//, async (route) => {
    if (await handledPreflight(route)) return;
    await route.fulfill(jsonResponse(true));
  });

  return user;
};

/**
 * Console noise that says nothing about the behaviour under test: the sandbox
 * cannot reach the real backend, and a third-party prop warning is not ours.
 */
export const isIgnorableConsoleError = (text: string) =>
  text.includes('supabase.co') ||
  text.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
  text.includes('ERR_CERT_AUTHORITY_INVALID') ||
  // Third-party tags the sandbox blocks outright (the Lovable tagger and the
  // PWA script). A net:: failure is a transport problem, never app logic.
  text.includes('net::ERR_CONNECTION_RESET') ||
  (text.includes('React does not recognize') && text.includes('fetchPriority'));
