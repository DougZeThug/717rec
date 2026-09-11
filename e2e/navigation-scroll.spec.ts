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

/** Short enough that any real page's content overflows it. */
const MEASURE_HEIGHT = 200;

/** The window these tests start in, before the page is measured. */
const DEFAULT_VIEWPORT = { width: 1280, height: 600 };

/** How long a height has to hold still before the page counts as settled. */
const SETTLE_INTERVAL = 250;

/**
 * The document height, once it has held still for a moment.
 *
 * These pages keep changing height after their navigation is on screen:
 * measured on /schedule, the document reads 419px for the first 200ms and
 * 752px from 400ms on, so a height read on arrival describes a page that no
 * longer exists. Reading it twice is a best effort and not a guarantee — 419px
 * holds for longer than the interval below — so this is used only to pick a
 * sensible window size. Nothing asserted afterwards may depend on the number
 * still being true.
 */
const settledScrollHeight = async (page: Page) => {
  let settled = 0;

  await expect
    .poll(async () => {
      const before = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.waitForTimeout(SETTLE_INTERVAL);
      settled = await page.evaluate(() => document.documentElement.scrollHeight);
      return settled === before;
    })
    .toBe(true);

  return settled;
};

/**
 * Size the window so the page overflows it, whatever the page happens to weigh.
 *
 * These pages are short with stubbed data, and they got shorter: /schedule had
 * only ~97px of scroll at 1280x600 before the desktop nav row was removed, and
 * removing it took that to zero, which made the tests fail their own
 * precondition. Sizing the window to the content keeps them about what they are
 * for — the reset on navigation — rather than about whether a page happens to
 * be taller than a fixed viewport.
 *
 * Measured at a deliberately short window first: the app shell is
 * `min-h-screen`, so the document is never shorter than the window and a tall
 * one tells you nothing about the content.
 */
const fitWindowToContent = async (page: Page) => {
  await page.setViewportSize({ width: DEFAULT_VIEWPORT.width, height: MEASURE_HEIGHT });
  const content = await settledScrollHeight(page);

  await page.setViewportSize({
    width: DEFAULT_VIEWPORT.width,
    // Leave the reported offset of scroll where the content allows it, and
    // never grow past the window the tests would otherwise have used.
    height: Math.max(MEASURE_HEIGHT, Math.min(DEFAULT_VIEWPORT.height, content - REPORTED_OFFSET)),
  });

  // The resize reflows the page, so let it come to rest again before anything
  // is measured against it.
  await settledScrollHeight(page);
};

/** Ask for the reported offset and answer with where the page actually went. */
const scrollToReportedOffset = (page: Page) =>
  page.evaluate((wanted) => {
    window.scrollTo(0, wanted);
    return window.scrollY;
  }, REPORTED_OFFSET);

/**
 * Scroll as far as the page allows, up to the reported offset, and return where
 * we actually landed.
 *
 * Reading the value back matters, and it has to be read back rather than worked
 * out in advance. A blind `scrollTo(0, 337)` on a page with less scroll than
 * that clamps, and every assertion built on it would pass without testing
 * anything — but a target measured from the height beforehand is worse, because
 * these pages are still loading and content that arrives or goes away moves how
 * far they can scroll. That is how this failed in CI: it asked for 219px, which
 * the page could reach when the height was read, of a page that by then had
 * 87px to give, and waited out the timeout for a position that no longer
 * existed.
 *
 * So ask, read back, and ask again until the answer stops moving. Landing
 * anywhere below the top is all these tests need; the reset they check is
 * measured on the page that opens next.
 */
const scrollDown = async (page: Page) => {
  await fitWindowToContent(page);

  let landed = 0;

  await expect
    .poll(
      async () => {
        const first = await scrollToReportedOffset(page);
        await page.waitForTimeout(SETTLE_INTERVAL);
        landed = await scrollToReportedOffset(page);
        return landed === first ? landed : 0;
      },
      { message: 'page must come to rest somewhere scrolled for this test to mean anything' }
    )
    .toBeGreaterThan(0);

  return landed;
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
    await page.setViewportSize(DEFAULT_VIEWPORT);
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
