import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { isIgnorableConsoleError, stubSupabase } from './helpers/supabaseMocks';

/**
 * B-14: following an in-app link used to leave the new page at the old page's
 * scroll offset, often below all of its content, so it looked blank.
 *
 * src/components/a11y/__tests__/ScrollToTop.test.tsx covers the component in
 * isolation. These cover what it cannot: that the component is mounted in the
 * app shell and fires on a real client-side navigation in a real browser.
 */

declare global {
  interface Window {
    /** Set by the POP test to record programmatic scrolls. */
    __e2eScrollCalls?: number[][];
  }
}

/** The offset the original report recorded on /schedule. */
const REPORTED_OFFSET = 337;

/**
 * Scroll as far as the page allows, up to the reported offset, and return where
 * we actually landed.
 *
 * Reading the value back matters: with no fixture data /schedule is only ~97px
 * scrollable, so a blind `scrollTo(0, 337)` clamps and every assertion built on
 * it would pass without testing anything.
 */
const scrollDown = async (page: Page) => {
  const target = await page.evaluate((wanted) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(wanted, max);
  }, REPORTED_OFFSET);

  expect(target, 'page must be scrollable for this test to mean anything').toBeGreaterThan(0);
  await page.evaluate((y) => window.scrollTo(0, y), target);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(target);
  return target;
};

/** Record programmatic scrolls from this point on, without suppressing them. */
const spyOnScrollTo = (page: Page) =>
  page.evaluate(() => {
    window.__e2eScrollCalls = [];
    const real = window.scrollTo.bind(window);
    window.scrollTo = ((...args: unknown[]) => {
      window.__e2eScrollCalls?.push(args as number[]);
      return (real as (...a: unknown[]) => void)(...args);
    }) as typeof window.scrollTo;
  });

const recordedScrolls = (page: Page) => page.evaluate(() => window.__e2eScrollCalls ?? []);

test.describe('scroll position on navigation', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
    await page.setViewportSize({ width: 1280, height: 600 });
  });

  // '/schedule' is the route named in the original report; '/' is the one that
  // reaches the full 337px without seeding match data.
  for (const source of ['/schedule', '/']) {
    test(`opens a linked page at the top, coming from ${source}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !isIgnorableConsoleError(msg.text())) {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(source);
      await expect(page.getByRole('link', { name: 'Help' })).toBeVisible();

      await scrollDown(page);

      await page.getByRole('link', { name: 'Help' }).click();
      await page.waitForURL('**/help');

      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      expect(consoleErrors).toEqual([]);
    });
  }

  test('resets on a forward navigation but not on a back navigation', async ({ page }) => {
    // The reset has to skip POP, or it beats the browser's own restoration and
    // the useScrollRestoration hook that /teams, /stats, /history and /insights
    // use to put a reader back where they were.
    //
    // /contact is deliberately a route with no restoration hook of its own, so
    // any scroll recorded here can only have come from the route-change reset.
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: 'Help' })).toBeVisible();
    await scrollDown(page);

    await spyOnScrollTo(page);
    await page.getByRole('link', { name: 'Help' }).click();
    await page.waitForURL('**/help');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    // Positive control: without this, "no calls on back" could just mean the
    // spy never worked. Polled, because scrollY can read 0 mid-transition
    // before the reset effect has actually run.
    await expect.poll(() => recordedScrolls(page), { timeout: 5000 }).toContainEqual([0, 0]);

    await spyOnScrollTo(page);
    await page.goBack();
    await page.waitForURL('**/contact');
    await page.waitForTimeout(1500);

    expect(await recordedScrolls(page), 'back navigation must be left alone').toEqual([]);
  });
});
