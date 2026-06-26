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

test.describe('playoff bracket browser behavior', () => {
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
  });

  test('creates a minimal bracket and advances a visible match', async ({ page }) => {
    await page.goto('/playoffs/e2e-bracket-proof');

    await expect(page.getByRole('heading', { name: 'Playoff Bracket E2E Proof' })).toBeVisible();
    await expect(page.getByTestId('bracket-created-state')).toHaveText(
      'Creation: No bracket created'
    );

    await page.getByRole('button', { name: 'Create minimal bracket' }).click();

    await expect(page.getByTestId('bracket-created-state')).toHaveText(
      'Creation: Bracket created successfully'
    );
    await expect(page.getByTestId('bracket-match-state')).toHaveText('Match status: pending');

    await page.getByRole('button', { name: 'Submit E2E Alpha 21-17' }).click();

    await expect(page.getByTestId('bracket-match-state')).toHaveText('Match status: completed');
    await expect(page.getByTestId('bracket-visible-score')).toHaveText('Visible score: 21-17');
    await expect(page.getByTestId('bracket-visible-winner')).toHaveText('Winner: E2E Alpha');
    await expect(page.getByTestId('bracket-visible-champion')).toHaveText('Champion: E2E Alpha');
  });
});
