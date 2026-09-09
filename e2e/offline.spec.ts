import { expect, test } from '@playwright/test';

import { stubSupabase } from './helpers/supabaseMocks';

/**
 * UX audit X-12. Two things used to happen when the signal dropped: nothing said
 * so, and a navigation to a page whose code had not been downloaded yet
 * replaced the whole app — header and all — with a developer error that did not
 * recover when the connection came back.
 */
test.describe('offline', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
  });

  test('says the connection is gone, and says it is back', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByTestId('offline-banner')).toBeHidden();

    await context.setOffline(true);
    // The finding asks for the banner within two seconds. It is event-driven,
    // so this is a ceiling rather than a wait.
    await expect(page.getByTestId('offline-banner')).toContainText(/you are offline/i, {
      timeout: 2000,
    });

    await context.setOffline(false);
    await expect(page.getByTestId('offline-banner')).toContainText(/back online/i);
  });

  test('a navigation while offline keeps the app and offers to wait', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    // A link click, not `page.goto`: this has to be an in-app navigation to a
    // page whose code this visit never downloaded. A document load would fail
    // in the browser and never reach the app at all.
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Standings' })
      .click();

    // The regression the audit screenshotted: the full-screen boundary with the
    // header gone. The header must survive, and the crash copy must not appear.
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toBeHidden();
    await expect(page.getByTestId('offline-banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: /did not download/i })).toBeVisible();

    // The half the old screen could not do: React caches a failed lazy import
    // for the life of the document, so the page only comes back by loading the
    // document again — which happens on its own, with nothing pressed.
    await context.setOffline(false);
    await expect(page.getByRole('heading', { name: /did not download/i })).toBeHidden({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/stats$/);
  });
});
