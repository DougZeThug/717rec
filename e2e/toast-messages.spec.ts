import { expect, test } from '@playwright/test';

import { jsonResponse, stubSupabase } from './helpers/supabaseMocks';

/**
 * B-13: TOAST_LIMIT was 1, so a second message replaced the first outright.
 * B-12: failed writes replaced the server's reason with a fixed sentence, and
 *       the reason was in fact being discarded before the toast even ran.
 *
 * The per-toast close button is the only reliable handle on a rendered toast:
 * Radix gives the visible toast no role, and puts role="status" on a separate
 * visually-hidden announcer.
 */
const toastCloseButtons = 'button[aria-label="Close notification"]';

/**
 * Fills the league's one message form on a topic that goes to the support
 * inbox, which is the mailbox these tests intercept. "What is this about?"
 * decides which one: a bug is answered by email, so the contact field is a
 * plain Email.
 */
const fillContactForm = async (page: import('@playwright/test').Page) => {
  await page.goto('/contact');
  await page.getByRole('combobox', { name: 'What is this about?' }).click();
  await page.getByRole('option', { name: 'Report a bug' }).click();
  await page.getByLabel('Name').fill('Regression Tester');
  await page.getByLabel('Email').fill('regression@example.com');
  await page.getByLabel('Message').fill('Checking that the failure reason reaches the user.');
};

test.describe('toast messages', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  // This used to press the home page's own message form, whose client-side
  // guard toasted on an empty submit. W7 merged the two forms into one, and the
  // survivor reports a bad field under the field rather than as a toast — so
  // the three toasts come from three refused sends instead, which is the
  // situation a real user hits when the league's rate limit is reached.
  test('shows three toasts at once instead of replacing the previous one', async ({ page }) => {
    await page.route(/\/functions\/v1\/send-support-email/, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill(jsonResponse(null, 204));
        return;
      }
      await route.fulfill(
        jsonResponse({ error: 'Too many requests. Please try again later.' }, 429)
      );
    });

    await fillContactForm(page);
    const send = page.getByRole('button', { name: 'Send Message' });

    await send.click();
    await expect(page.locator(toastCloseButtons)).toHaveCount(1);

    // Well inside the ~5s Radix auto-close window.
    await send.click();
    await expect(page.locator(toastCloseButtons)).toHaveCount(2);

    await send.click();
    await expect(page.locator(toastCloseButtons)).toHaveCount(3);

    // The limit holds at three rather than growing without bound.
    await send.click();
    await expect(page.locator(toastCloseButtons)).toHaveCount(3);
  });

  test.describe('when a write fails', () => {
    test("shows the edge function's own reason", async ({ page }) => {
      // The rate limit cannot be triggered for real here: the function's CORS
      // allowlist omits port 8080 (open bug B-15), and a real run would send
      // five support emails from the production project. Injecting the
      // response still exercises everything B-12 changed — the unwrap of
      // error.context, the typed error, and the sanitiser's prefixing.
      await page.route(/\/functions\/v1\/send-support-email/, async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill(jsonResponse(null, 204));
          return;
        }
        // Verbatim from supabase/functions/send-support-email/index.ts:128.
        await route.fulfill(
          jsonResponse({ error: 'Too many requests. Please try again later.' }, 429)
        );
      });

      await fillContactForm(page);
      await page.getByRole('button', { name: 'Send Message' }).click();

      await expect(
        page.getByText('Failed to send message: Too many requests. Please try again later.')
      ).toBeVisible();
    });

    test('never shows the placeholder supabase-js puts on the error', async ({ page }) => {
      // A failure with no readable body must fall back to the caller's phrase.
      // Showing error.message here would read "Edge Function returned a non-2xx
      // status code", which is what the naive version of this fix would have done.
      await page.route(/\/functions\/v1\/send-support-email/, async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill(jsonResponse(null, 204));
          return;
        }
        await route.fulfill({
          status: 500,
          contentType: 'text/html',
          headers: { 'access-control-allow-origin': '*' },
          body: '<html>502 Bad Gateway</html>',
        });
      });

      await fillContactForm(page);
      await page.getByRole('button', { name: 'Send Message' }).click();

      await expect(page.getByText('Failed to send message. Please try again.')).toBeVisible();
      await expect(page.getByText(/non-2xx/)).toHaveCount(0);
    });
  });
});
