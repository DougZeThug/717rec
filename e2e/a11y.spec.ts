import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// Blocking accessibility scan against key public and weekly admin routes.
// Runs as a required gate (.github/workflows/a11y.yml).
//
// To silence a specific axe rule, add its id to DISABLED_RULES with a
// comment explaining why. Prefer fixing the underlying issue over disabling.
const DISABLED_RULES: string[] = [
  // e.g. 'color-contrast', // <reason> — remove by <YYYY-MM-DD>
];

const AUTH_STORAGE_KEY = 'sb-wcitdamvochthvxvtxyb-auth-token';

const jsonResponse = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, prefer',
    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
  },
  body: JSON.stringify(body),
});

const seedAdminAuth = async (page: Page, activeTab: string) => {
  const user = {
    id: 'e2e-a11y-admin-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'e2e-a11y-admin@example.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
  };

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
      window.sessionStorage.setItem('adminActiveTab', tab);
    },
    { key: AUTH_STORAGE_KEY, seededUser: user, tab: activeTab }
  );

  await page.route(/\/auth\/v1\/user/, async (route) => {
    await route.fulfill(jsonResponse({ user }));
  });

  await page.route(/\/rest\/v1\//, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill(jsonResponse(null, 204));
      return;
    }

    await route.fulfill(jsonResponse([]));
  });

  await page.route(/\/rest\/v1\/profiles/, async (route) => {
    await route.fulfill(
      jsonResponse({
        id: user.id,
        username: 'e2e_a11y_admin',
        full_name: 'E2E A11y Admin',
        avatar_url: null,
        created_at: '2026-06-22T00:00:00.000Z',
        is_admin: true,
      })
    );
  });

  await page.route(/\/rest\/v1\/rpc\//, async (route) => {
    await route.fulfill(jsonResponse(true));
  });
};

const assertNoA11yViolations = async (page: Page) => {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
  if (DISABLED_RULES.length > 0) builder.disableRules(DISABLED_RULES);
  const results = await builder.analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
};

const routes = ['/', '/teams', '/stats', '/history', '/playoffs', '/help'];

for (const route of routes) {
  test(`a11y: ${route} has no detectable WCAG 2 A/AA violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    await assertNoA11yViolations(page);
  });
}

const adminSections = [
  { id: 'timeslots', label: 'Timeslots' },
  { id: 'scores', label: 'Scores' },
  { id: 'teams', label: 'Teams' },
];

for (const section of adminSections) {
  test(`a11y: /admin ${section.label} has no detectable WCAG 2 A/AA violations`, async ({
    page,
  }) => {
    await seedAdminAuth(page, section.id);
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: section.label })).toBeVisible();
    await assertNoA11yViolations(page);
  });
}

// A user who has asked their operating system to reduce motion. See B-22.
test.describe('reduced motion', () => {
  test('stills animation and smooth scrolling', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
    ).toBe('auto');

    // Probe elements rather than whatever the live page happens to be rendering,
    // so the assertion does not depend on load state.
    // getComputedStyle reports the 0.01ms override as '1e-05s'.
    const durations = await page.evaluate(() =>
      ['animate-fade-in', 'animate-fade-in-slide-up', 'animate-scale-in'].map((className) => {
        const el = document.createElement('div');
        el.className = className;
        document.body.appendChild(el);
        const duration = getComputedStyle(el).animationDuration;
        el.remove();
        return duration;
      })
    );
    for (const duration of durations) expect(duration).toBe('1e-05s');
  });

  test('keeps spinners turning, because they carry information', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const spin = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'animate-spin';
      document.body.appendChild(el);
      const style = getComputedStyle(el);
      return { duration: style.animationDuration, iterations: style.animationIterationCount };
    });

    expect(spin).toEqual({ duration: '1s', iterations: 'infinite' });
  });

  test('leaves motion alone when no preference is set', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
    ).toBe('smooth');
  });
});

// The navigation menu on a narrow screen is a disclosure, not a dialog. See B-23.
test.describe('mobile navigation menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('reports its state, and Escape closes it and restores focus', async ({ page }) => {
    await page.goto('/');

    const trigger = page.getByRole('button', { name: 'Open menu' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-controls', 'mobile-navigation-panel');

    await trigger.click();
    const openTrigger = page.getByRole('button', { name: 'Close menu' });
    await expect(openTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-navigation-panel')).toBeVisible();

    await assertNoA11yViolations(page);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });
});
