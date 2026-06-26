import { expect, test } from '@playwright/test';

const pendingMatch = {
  id: 'e2e-pending-match-1',
  team1_id: 'e2e-team-alpha',
  team2_id: 'e2e-team-beta',
  team1_name: 'E2E Alpha',
  team2_name: 'E2E Beta',
  team1_logo: null,
  team2_logo: null,
  date: '2026-06-22T19:00:00.000Z',
  location: 'E2E Court 1',
};

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

test.describe('score submission workflow', () => {
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

    await page.route('**/rest/v1/v_pending_matches**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
        },
        body: JSON.stringify([pendingMatch]),
      });
    });
  });

  test('submits a valid score report for a pending public match', async ({ page }) => {
    let submittedPayload: unknown;

    await page.route('**/functions/v1/submit-score-report', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
          },
        });
        return;
      }

      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Pending Scores' })).toBeVisible();
    await expect(page.getByText('E2E Alpha', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Beta', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /^Report$/ }).click();
    await expect(page.getByRole('dialog', { name: 'Report Match Score' })).toBeVisible();

    await page.getByLabel(/Your Name/).fill('Playwright Reporter');
    await page.getByLabel(/Your Team/).fill('E2E Alpha');
    await page
      .getByLabel(/Score Report/)
      .fill('E2E Alpha beat E2E Beta 21-17 in a verified test report.');

    await page.getByRole('button', { name: 'Submit Report' }).click();

    await expect(page.getByRole('dialog', { name: 'Report Match Score' })).toBeHidden();
    await expect(page.getByText('Score Submitted', { exact: true })).toBeVisible();
    expect(submittedPayload).toEqual({
      match_id: pendingMatch.id,
      submitter_name: 'Playwright Reporter',
      submitter_team: 'E2E Alpha',
      message: 'E2E Alpha beat E2E Beta 21-17 in a verified test report.',
    });
  });

  test('blocks an invalid score report before calling submission API', async ({ page }) => {
    let submitRequests = 0;

    await page.route('**/functions/v1/submit-score-report', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
          },
        });
        return;
      }

      submitRequests += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: 'Invalid submissions should not reach the API' }),
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: /^Report$/ }).click();

    await page.getByRole('button', { name: 'Submit Report' }).click();

    await expect(page.getByText('Your name is required')).toBeVisible();
    await expect(page.getByText('Score report is required')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Report Match Score' })).toBeVisible();
    expect(submitRequests).toBe(0);
  });
});
