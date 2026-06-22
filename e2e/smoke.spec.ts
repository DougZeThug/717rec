import { expect, test } from '@playwright/test';

test.describe('app shell smoke', () => {
  test('loads home and navigates via primary nav', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Brand is visible on the navbar
    await expect(page.getByRole('link', { name: /717Rec/i }).first()).toBeVisible();

    // Primary navigation links are present (desktop or mobile shell)
    for (const label of ['Home', 'Teams', 'Schedule', 'Standings', 'Playoffs']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()).toBeVisible();
    }

    // Navigate to Teams and verify the route changes and main content renders
    await page.getByRole('link', { name: /^Teams$/i }).first().click();
    await expect(page).toHaveURL(/\/teams\b/);
    await expect(page.locator('main, #main-content').first()).toBeVisible();

    // No console errors during the smoke flow
    expect(consoleErrors, `console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});