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

  test('advances semifinal winners into the final and crowns a champion', async ({ page }) => {
    await page.goto('/playoffs/e2e-bracket-proof');

    await expect(page.getByRole('heading', { name: 'Playoff Bracket E2E Proof' })).toBeVisible();
    await expect(page.getByTestId('bracket-created-state')).toHaveText(
      'Creation: No bracket created'
    );

    // Create the four-team, two-round bracket. The final starts empty (TBD).
    await page.getByRole('button', { name: 'Create 4-team bracket' }).click();

    await expect(page.getByTestId('bracket-created-state')).toHaveText(
      'Creation: Bracket created successfully'
    );
    await expect(page.getByTestId('bracket-semifinal-state')).toHaveText(
      'Semifinals: 0/2 completed'
    );
    await expect(page.getByTestId('bracket-final-slot1')).toHaveText('Final team 1: TBD');
    await expect(page.getByTestId('bracket-final-slot2')).toHaveText('Final team 2: TBD');
    await expect(page.getByTestId('bracket-visible-champion')).toHaveText('Champion: TBD');

    // Advance semifinal 1 → Alpha visibly advances into the first final slot.
    await page.getByRole('button', { name: 'Submit SF1: Alpha over Delta' }).click();

    await expect(page.getByTestId('bracket-semifinal-state')).toHaveText(
      'Semifinals: 1/2 completed'
    );
    await expect(page.getByTestId('bracket-final-slot1')).toHaveText('Final team 1: E2E Alpha');
    await expect(page.getByTestId('bracket-final-slot2')).toHaveText('Final team 2: TBD');
    await expect(page.getByTestId('bracket-visible-champion')).toHaveText('Champion: TBD');

    // Advance semifinal 2 → Beta advances into the second final slot.
    await page.getByRole('button', { name: 'Submit SF2: Beta over Gamma' }).click();

    await expect(page.getByTestId('bracket-semifinal-state')).toHaveText(
      'Semifinals: 2/2 completed'
    );
    await expect(page.getByTestId('bracket-final-slot2')).toHaveText('Final team 2: E2E Beta');

    // Play the fully-populated final → Alpha is crowned champion.
    await page.getByRole('button', { name: 'Submit Final: Alpha over Beta' }).click();

    await expect(page.getByTestId('bracket-final-state')).toHaveText('Final status: completed');
    await expect(page.getByTestId('bracket-visible-champion')).toHaveText('Champion: E2E Alpha');
  });
});
