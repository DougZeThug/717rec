import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Blocking accessibility scan against key public routes.
// Runs as a required gate (.github/workflows/a11y.yml).
//
// To silence a specific axe rule, add its id to DISABLED_RULES with a
// comment explaining why. Prefer fixing the underlying issue over disabling.
const DISABLED_RULES: string[] = [
  // e.g. 'color-contrast', // <reason> — remove by <YYYY-MM-DD>
];

const routes = ['/', '/teams', '/stats', '/history', '/playoffs', '/help'];

for (const route of routes) {
  test(`a11y: ${route} has no detectable WCAG 2 A/AA violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    if (DISABLED_RULES.length > 0) builder.disableRules(DISABLED_RULES);
    const results = await builder.analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
