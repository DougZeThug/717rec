import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Informational accessibility scan against key public routes.
// Runs in a non-blocking workflow (.github/workflows/a11y.yml).
const routes = ['/', '/teams', '/stats', '/history', '/playoffs', '/help'];

for (const route of routes) {
  test(`a11y: ${route} has no detectable WCAG 2 A/AA violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
