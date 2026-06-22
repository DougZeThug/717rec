import { expect, test } from '@playwright/test';

const SUPABASE_URL = 'https://wcitdamvochthvxvtxyb.supabase.co';
const AUTH_STORAGE_KEY = 'sb-wcitdamvochthvxvtxyb-auth-token';

const adminUser = {
  id: 'e2e-admin-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e-admin@example.com',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-06-22T00:00:00.000Z',
};

const match = {
  id: 'e2e-mass-score-match-1',
  team1_id: 'e2e-team-alpha',
  team2_id: 'e2e-team-beta',
  team1_score: 0,
  team2_score: 0,
  team1_game_wins: 0,
  team2_game_wins: 0,
  winner_id: null,
  loser_id: null,
  iscompleted: false,
  date: '2026-06-22T23:00:00.000Z',
  location: 'E2E Court 1',
  season_id: 'e2e-season',
  round_number: 1,
  bracket_id: null,
  team1: { id: 'e2e-team-alpha', name: 'E2E Alpha', logo_url: null, image_url: null },
  team2: { id: 'e2e-team-beta', name: 'E2E Beta', logo_url: null, image_url: null },
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

test.describe('admin mass score submission workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ key, user }) => {
        const session = {
          access_token: 'e2e-access-token',
          refresh_token: 'e2e-refresh-token',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user,
        };
        window.localStorage.setItem(key, JSON.stringify(session));
        window.sessionStorage.setItem('adminActiveTab', 'scores');
      },
      { key: AUTH_STORAGE_KEY, user: adminUser }
    );

    await page.route(/\/auth\/v1\/user/, async (route) => {
      await route.fulfill(jsonResponse({ user: adminUser }));
    });

    await page.route(/\/rest\/v1\//, async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill(jsonResponse(null, 204));
        return;
      }

      await route.fulfill(jsonResponse([]));
    });

    await page.route(/\/rest\/v1\/profiles/, async (route) => {
      await route.fulfill(
        jsonResponse({
          id: adminUser.id,
          username: 'e2e_admin',
          full_name: 'E2E Admin',
          avatar_url: null,
          created_at: '2026-06-22T00:00:00.000Z',
          is_admin: true,
        })
      );
    });

    await page.route(/\/rest\/v1\/matches/, async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill(jsonResponse(null, 204));
        return;
      }

      if (request.method() === 'PATCH') {
        await route.fulfill(jsonResponse({ ...match, ...request.postDataJSON() }));
        return;
      }

      const url = new URL(request.url());
      if (url.searchParams.get('id') === `eq.${match.id}`) {
        await route.fulfill(jsonResponse(match));
        return;
      }

      await route.fulfill(jsonResponse([match]));
    });

    await page.route(/\/rest\/v1\/rpc\//, async (route) => {
      await route.fulfill(jsonResponse({ success: true }));
    });

    await page.route(/\/rest\/v1\/admin_requests/, async (route) => {
      await route.fulfill(jsonResponse([]));
    });
  });

  test('enters and submits a valid mass score without depending on other admin flows', async ({
    page,
  }) => {
    const matchUpdates: unknown[] = [];
    page.on('request', (request) => {
      if (
        request.url().startsWith(`${SUPABASE_URL}/rest/v1/matches`) &&
        request.method() === 'PATCH'
      ) {
        matchUpdates.push(request.postDataJSON());
      }
    });

    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Mass Score Entry' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('E2E Alpha', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('E2E Beta', { exact: true }).first()).toBeVisible();

    await page.getByTestId('score-button-2–0').click();
    await expect(page.getByRole('button', { name: 'Submit (1) Changes' })).toBeEnabled();

    await page.getByRole('button', { name: 'Submit (1) Changes' }).click();

    await expect(page.getByText('✅ Matches Submitted', { exact: true })).toBeVisible();
    expect(matchUpdates).toEqual([
      expect.objectContaining({
        team1_score: 1,
        team2_score: 0,
        team1_game_wins: 2,
        team2_game_wins: 0,
        winner_id: 'e2e-team-alpha',
        loser_id: 'e2e-team-beta',
        iscompleted: true,
      }),
    ]);
  });

  test('blocks an invalid completed mass score before writing match updates', async ({ page }) => {
    const matchUpdates: unknown[] = [];
    page.on('request', (request) => {
      if (
        request.url().startsWith(`${SUPABASE_URL}/rest/v1/matches`) &&
        request.method() === 'PATCH'
      ) {
        matchUpdates.push(request.postDataJSON());
      }
    });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Mass Score Entry' })).toBeVisible({
      timeout: 15000,
    });

    await page.getByText('Mark as Complete').click();
    await expect(page.getByRole('button', { name: 'Submit All Changes' })).toBeDisabled();
    await expect(page.getByText('Invalid Score')).toBeVisible();
    expect(matchUpdates).toEqual([]);
  });
});
