import type { Page, Request } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { jsonResponse, seedAdminAuth, stubSupabase } from './helpers/supabaseMocks';

/**
 * B-11: four admin actions destroyed or overwrote data on the first press.
 *
 * The assertion that matters in each case is not that a dialog appeared — it is
 * that cancelling writes nothing. A missing guard would still show the dialog
 * if the click also fired the mutation.
 */

/** Record every write, so "cancel did nothing" can be asserted rather than assumed. */
const recordWrites = (page: Page, table: RegExp) => {
  const writes: string[] = [];
  page.on('request', (request: Request) => {
    const method = request.method();
    if (method === 'GET' || method === 'OPTIONS') return;
    if (!table.test(request.url())) return;
    writes.push(`${method} ${new URL(request.url()).pathname}`);
  });
  return writes;
};

const TIMESTAMPS = { created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };

test.describe('destructive admin actions ask first', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabase(page);
    await page.setViewportSize({ width: 1400, height: 900 });
  });

  test('deleting a contact request', async ({ page }) => {
    await seedAdminAuth(page, { tab: 'contact-inbox' });
    await page.route(/\/rest\/v1\/contact_requests/, (route) =>
      route.fulfill(
        jsonResponse([
          {
            id: 'req-1',
            request_type: 'general',
            submitter_name: 'Jane Doe',
            submitter_team: null,
            submitter_contact: 'jane@example.com',
            players: null,
            message: 'Can we move our match?',
            user_id: null,
            team_id: null,
            is_verified: false,
            status: 'open',
            admin_notes: null,
            resolved_by: null,
            resolved_at: null,
            ...TIMESTAMPS,
          },
        ])
      )
    );

    const writes = recordWrites(page, /contact_requests/);
    await page.goto('/admin');

    await page.getByRole('button', { name: /^Delete$/ }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Delete this message?');
    await expect(dialog).toContainText('Jane Doe');
    expect(writes, 'opening the prompt must not delete').toEqual([]);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(writes, 'cancelling must not delete').toEqual([]);
  });

  test('deleting a notification', async ({ page }) => {
    await seedAdminAuth(page);
    await page.route(/\/rest\/v1\/admin_notifications/, (route) =>
      route.fulfill(
        jsonResponse([
          {
            id: 'note-1',
            title: 'Rain delay',
            body: 'Week 3 is postponed.',
            created_by: null,
            expires_at: null,
            ...TIMESTAMPS,
          },
        ])
      )
    );

    const writes = recordWrites(page, /admin_notifications/);
    await page.goto('/admin/notifications');

    await page.getByRole('button', { name: 'Delete notification' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Delete this notification?');
    await expect(dialog).toContainText('Rain delay');
    expect(writes).toEqual([]);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(writes, 'cancelling must not delete').toEqual([]);
  });

  test('removing a Challonge fallback bracket', async ({ page }) => {
    await seedAdminAuth(page, { tab: 'hero-cards' });
    await page.route(/\/rest\/v1\/challonge_fallback_config/, (route) =>
      route.fulfill(
        jsonResponse({
          id: 'cfg-1',
          enabled: true,
          header_title: 'Playoff brackets',
          header_subtitle: null,
          ...TIMESTAMPS,
        })
      )
    );
    await page.route(/\/rest\/v1\/challonge_fallback_brackets/, (route) =>
      route.fulfill(
        jsonResponse([
          { id: 'b-1', title: 'Spring Playoffs', slug: '5hy558bb', sort_order: 0, ...TIMESTAMPS },
        ])
      )
    );

    const writes = recordWrites(page, /challonge_fallback_brackets/);
    await page.goto('/admin');

    await page.getByRole('button', { name: 'Remove bracket' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Remove this saved bracket?');
    await expect(dialog).toContainText('Spring Playoffs');
    expect(writes).toEqual([]);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect(writes, 'cancelling must not delete').toEqual([]);
  });

  test("changing a team's division", async ({ page }) => {
    await seedAdminAuth(page, { tab: 'teams' });
    await page.route(/\/rest\/v1\/v_team_details/, (route) =>
      route.fulfill(
        jsonResponse([
          {
            team_id: 'team-1',
            name: 'Bag Boys',
            logo_url: null,
            image_url: null,
            players: 'Alex, Sam',
            wins: 3,
            losses: 1,
            game_wins: 7,
            game_losses: 4,
            created_at: TIMESTAMPS.created_at,
            division_id: 'div-east',
            divisionname: 'East',
            sos: 0.5,
            power_score: 10,
            career_power_score: 10,
            win_percentage: 75,
            game_win_percentage: 63,
            close_match_losses: 0,
          },
        ])
      )
    );
    await page.route(/\/rest\/v1\/divisions/, (route) =>
      route.fulfill(
        jsonResponse([
          {
            id: 'div-east',
            name: 'East',
            division_weight: 2,
            display_division: 'East',
            created_at: TIMESTAMPS.created_at,
          },
          {
            id: 'div-hidden',
            name: 'Hidden',
            division_weight: 0,
            display_division: 'Hidden',
            created_at: TIMESTAMPS.created_at,
          },
        ])
      )
    );

    const writes = recordWrites(page, /\/rest\/v1\/teams/);
    await page.goto('/admin');

    const divisionSelect = page.getByRole('combobox', { name: 'Set division for Bag Boys' });
    await expect(divisionSelect).toBeVisible();
    await divisionSelect.click();
    await page.getByRole('option', { name: 'Hidden' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Change this team's division?");
    // Hidden is how a team is removed from the public site, so the prompt says so.
    await expect(dialog).toContainText('do not appear in the standings');
    expect(writes).toEqual([]);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    expect(writes, 'cancelling must not write').toEqual([]);
    // The Select is controlled from server data, so it never moved off East.
    await expect(divisionSelect).toContainText('East');
  });
});
