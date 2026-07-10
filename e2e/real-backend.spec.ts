import { expect, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupSeededMatch,
  createAdminClient,
  ensureTestUser,
  getRealBackendEnv,
  type RealBackendEnv,
  type SeededMatch,
  seedPendingMatch,
} from './helpers/realBackend';

const env = getRealBackendEnv();

test.describe('@real-backend golden paths', () => {
  test.skip(
    !env,
    'Set E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY / E2E_SUPABASE_SERVICE_ROLE_KEY / E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD to enable.'
  );

  let realEnv: RealBackendEnv;
  let admin: SupabaseClient;
  let seeded: SeededMatch;

  test.beforeAll(async () => {
    if (!env) return;
    realEnv = env;
    admin = createAdminClient(realEnv);
    await ensureTestUser(admin, realEnv);
  });

  test.beforeEach(async () => {
    seeded = await seedPendingMatch(admin);
  });

  test.afterEach(async () => {
    if (seeded) await cleanupSeededMatch(admin, seeded);
  });

  test('login → schedule → submit score against real Supabase', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Login
    await page.goto('/auth');
    await page.getByLabel('Email').fill(realEnv.email);
    await page.getByLabel('Password').fill(realEnv.password);
    await page.getByRole('button', { name: /^Login$/i }).click();
    await expect(page).toHaveURL(/\/(?!auth)/, { timeout: 15_000 });

    // 2. View schedule
    await page.goto('/schedule');
    await expect(page.locator('main, #main-content').first()).toBeVisible();
    await expect(page.getByText(/failed|error/i)).toHaveCount(0);

    // 3. Submit score for the seeded pending match
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Pending Scores' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(seeded.team1Name)).toBeVisible();

    await page
      .getByRole('button', { name: /^Report$/ })
      .first()
      .click();
    await expect(page.getByRole('dialog', { name: 'Report Match Score' })).toBeVisible();

    await page.getByLabel(/Your Name/).fill('E2E Reporter');
    await page.getByLabel(/Your Team/).fill(seeded.team1Name);
    await page
      .getByLabel(/Score Report/)
      .fill(`${seeded.team1Name} beat ${seeded.team2Name} 21-17 in a real-backend E2E run.`);

    await page.getByRole('button', { name: 'Submit Report' }).click();
    await expect(page.getByRole('dialog', { name: 'Report Match Score' })).toBeHidden({
      timeout: 15_000,
    });
    await expect(page.getByText('Score Submitted', { exact: true })).toBeVisible();

    // Verify the row actually landed in the database
    const { data: rows, error } = await admin
      .from('score_submissions')
      .select('id, match_id, submitter_name, submitter_team, message')
      .eq('match_id', seeded.matchId);
    expect(error).toBeNull();
    expect(rows?.length).toBeGreaterThan(0);
    expect(rows?.[0]?.submitter_name).toBe('E2E Reporter');

    expect(
      consoleErrors.filter((t) => !t.includes('supabase.co') && !t.includes('fetchPriority')),
      `console errors:\n${consoleErrors.join('\n')}`
    ).toEqual([]);
  });
});
