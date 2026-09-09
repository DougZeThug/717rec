import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const AUTH_STORAGE_KEY = 'sb-wcitdamvochthvxvtxyb-auth-token';

const makeUser = (id: string, email: string) => ({
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email,
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-06-22T00:00:00.000Z',
});

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

const seedAuthenticatedUser = async (
  page: Page,
  options: { id: string; email: string; isAdmin: boolean }
) => {
  const user = makeUser(options.id, options.email);

  await page.addInitScript(
    ({ key, seededUser }) => {
      const session = {
        access_token: 'e2e-access-token',
        refresh_token: 'e2e-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: seededUser,
      };
      window.localStorage.setItem(key, JSON.stringify(session));
      window.sessionStorage.removeItem('adminActiveTab');
    },
    { key: AUTH_STORAGE_KEY, seededUser: user }
  );

  await page.route(/\/auth\/v1\/user/, async (route) => {
    await route.fulfill(jsonResponse({ user }));
  });

  await page.route(/\/rest\/v1\//, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill(jsonResponse(null, 204));
      return;
    }

    await route.fulfill(jsonResponse([]));
  });

  await page.route(/\/rest\/v1\/profiles/, async (route) => {
    await route.fulfill(
      jsonResponse({
        id: user.id,
        username: options.isAdmin ? 'e2e_admin' : 'e2e_member',
        full_name: options.isAdmin ? 'E2E Admin' : 'E2E Member',
        avatar_url: null,
        created_at: '2026-06-22T00:00:00.000Z',
        is_admin: options.isAdmin,
      })
    );
  });

  await page.route(/\/rest\/v1\/rpc\//, async (route) => {
    await route.fulfill(jsonResponse(options.isAdmin));
  });
};

test.describe('admin access control', () => {
  test('redirects an authenticated non-admin away from admin-only screens', async ({ page }) => {
    await seedAuthenticatedUser(page, {
      id: 'e2e-non-admin-user',
      email: 'e2e-member@example.com',
      isAdmin: false,
    });

    await page.goto('/admin');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /717Rec/i }).first()).toBeVisible();
  });

  test('allows an authenticated admin to reach the admin landing screen', async ({ page }) => {
    await seedAuthenticatedUser(page, {
      id: 'e2e-admin-user',
      email: 'e2e-admin@example.com',
      isAdmin: true,
    });

    await page.goto('/admin');

    // A bare /admin names no section, so it redirects to the one it opens.
    await expect(page).toHaveURL(/\/admin\/timeslots$/);
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: 'Timeslots' })).toBeVisible();
  });

  // UX audit A-01: sections had no addresses, so they could not be linked and
  // Back left the console entirely.
  test('opens the section named in the address, and Back steps between sections', async ({
    page,
  }) => {
    await seedAuthenticatedUser(page, {
      id: 'e2e-admin-user',
      email: 'e2e-admin@example.com',
      isAdmin: true,
    });

    await page.goto('/admin/pending-matches');

    const adminMenu = page.getByRole('navigation', { name: 'Admin sections' });

    await expect(page).toHaveURL(/\/admin\/pending-matches$/);
    await expect(adminMenu.getByRole('button', { name: 'Score approvals' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    await adminMenu.getByRole('button', { name: 'Divisions' }).click();
    await expect(page).toHaveURL(/\/admin\/divisions$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/pending-matches$/);
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });

  // /admin/notifications and /timeslots were pages of their own once.
  test('sends the old admin addresses to their sections', async ({ page }) => {
    await seedAuthenticatedUser(page, {
      id: 'e2e-admin-user',
      email: 'e2e-admin@example.com',
      isAdmin: true,
    });

    await page.goto('/timeslots');
    await expect(page).toHaveURL(/\/admin\/timeslots$/);

    await page.goto('/admin/notifications');
    await expect(page).toHaveURL(/\/admin\/notifications$/);
    // Scoped to the menu: the navbar's notification bell shares the name.
    await expect(
      page
        .getByRole('navigation', { name: 'Admin sections' })
        .getByRole('button', { name: 'Notifications' })
    ).toHaveAttribute('aria-current', 'page');
  });
});
