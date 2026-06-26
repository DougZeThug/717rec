import { expect, test } from '@playwright/test';

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

test.describe('app shell smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/auth\/v1\//, async (route) => {
      await route.fulfill(jsonResponse({ user: null }));
    });

    await page.route(/\/rest\/v1\//, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill(jsonResponse(null, 204));
        return;
      }

      await route.fulfill(jsonResponse([]));
    });

    await page.route(/\/functions\/v1\//, async (route) => {
      await route.fulfill(jsonResponse({ ok: true }));
    });
  });

  test('loads home and navigates via primary nav', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (
        text.includes('supabase.co') ||
        text.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
        text.includes('ERR_CERT_AUTHORITY_INVALID')
      ) {
        return;
      }
      if (text.includes('React does not recognize') && text.includes('fetchPriority')) {
        return;
      }
      consoleErrors.push(text);
    });

    await page.goto('/');

    // Brand is visible on the navbar
    await expect(page.getByRole('link', { name: /717Rec/i }).first()).toBeVisible();

    // Primary navigation links are present (desktop or mobile shell)
    for (const label of ['Home', 'Teams', 'Schedule', 'Standings', 'Playoffs']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()
      ).toBeVisible();
    }

    // Navigate to Teams and verify the route changes and main content renders
    await page
      .getByRole('link', { name: /^Teams$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/teams\b/);
    await expect(page.locator('main, #main-content').first()).toBeVisible();

    // No console errors during the smoke flow
    expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
