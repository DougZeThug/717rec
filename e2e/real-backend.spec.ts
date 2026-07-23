import { expect, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupSeededMatch,
  cleanupSeededAdminScoreFixture,
  cleanupSeededScheduleFixture,
  cleanupSeededStandingsFixture,
  cleanupSeededTeamsFixture,
  createAdminClient,
  ensureTestUser,
  ensureTestUserIsAdmin,
  getRealBackendEnv,
  type RealBackendEnv,
  type SeededMatch,
  seedAdminScoreFixture,
  seedScheduleFixture,
  seedStandingsFixture,
  seedTeamsFixture,
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
    await ensureTestUserIsAdmin(admin, realEnv);
  });

  test('login → schedule → submit score against real Supabase', async ({ page }) => {
    seeded = await seedPendingMatch(admin);
    try {
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
    } finally {
      await cleanupSeededMatch(admin, seeded);
    }
  });

  test('public schedule renders seeded matches via anon client', async ({ page }) => {
    const fixture = await seedScheduleFixture(admin);
    try {
      await page.goto('/schedule');
      await expect(page.locator('main, #main-content').first()).toBeVisible();
      // Team names from the seeded match should render somewhere on the page.
      await expect(page.getByText(fixture.team1Name).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(fixture.team2Name).first()).toBeVisible();
    } finally {
      await cleanupSeededScheduleFixture(admin, fixture);
    }
  });

  test('public standings renders seeded team stats via anon client', async ({ page }) => {
    const fixture = await seedStandingsFixture(admin);
    try {
      await page.goto('/stats');
      await expect(page.locator('main, #main-content').first()).toBeVisible();
      await expect(page.getByText(fixture.team1Name).first()).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(fixture.team2Name).first()).toBeVisible();

      // Re-read the persisted row through the anon client-facing view to
      // confirm the numbers surfaced to the public API match what we seeded.
      const { data: stats } = await admin
        .from('team_season_stats')
        .select('team_id, match_wins, match_losses')
        .eq('season_id', fixture.season.seasonId)
        .in('team_id', [fixture.team1Id, fixture.team2Id]);
      const winner = stats?.find((s) => s.team_id === fixture.team1Id);
      const loser = stats?.find((s) => s.team_id === fixture.team2Id);
      expect(winner?.match_wins).toBe(1);
      expect(loser?.match_losses).toBe(1);
    } finally {
      await cleanupSeededStandingsFixture(admin, fixture);
    }
  });

  test('public teams page renders seeded teams via anon client', async ({ page }) => {
    const fixture = await seedTeamsFixture(admin);
    try {
      await page.goto('/teams');
      await expect(page.locator('main, #main-content').first()).toBeVisible();
      for (const name of fixture.teamNames) {
        await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
      }
    } finally {
      await cleanupSeededTeamsFixture(admin, fixture);
    }
  });

  test('admin can submit a score for a seeded match', async ({ page }) => {
    const fixture = await seedAdminScoreFixture(admin);
    try {
      // Log in.
      await page.goto('/auth');
      await page.getByLabel('Email').fill(realEnv.email);
      await page.getByLabel('Password').fill(realEnv.password);
      await page.getByRole('button', { name: /^Login$/i }).click();
      await expect(page).toHaveURL(/\/(?!auth)/, { timeout: 15_000 });

      // Preselect the Scores tab so AdminSidebar restores it on first render.
      await page.evaluate(() => {
        sessionStorage.setItem('adminActiveTab', 'scores');
      });
      await page.goto('/admin');

      // Wait for the Mass Score Entry heading to render (admin gate cleared).
      await expect(page.getByRole('heading', { name: /Mass Score Entry/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText(fixture.team1Name).first()).toBeVisible({ timeout: 20_000 });

      // Pick the 2–0 button for the seeded match. testid is scoped by match id.
      const scoreButton = page.locator(
        `[data-testid="score-button-2–0"][data-match-id="${fixture.matchId}"]`
      );
      await scoreButton.first().click();

      // Submit the batch.
      await page.getByRole('button', { name: /^Submit .*Changes?$/i }).click();

      // Wait for the row to reflect completion in the database.
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('matches')
              .select('iscompleted, team1_score, team2_score, team1_game_wins, team2_game_wins')
              .eq('id', fixture.matchId)
              .maybeSingle();
            return data;
          },
          { timeout: 20_000, message: 'seeded admin match never reached completed state' }
        )
        .toMatchObject({
          iscompleted: true,
          team1_score: 1,
          team2_score: 0,
          team1_game_wins: 2,
          team2_game_wins: 0,
        });

      // Season-stats delta: winner (+1 match_wins), loser (+1 match_losses).
      const { data: postStats } = await admin
        .from('team_season_stats')
        .select('team_id, match_wins, match_losses')
        .eq('season_id', fixture.season.seasonId)
        .in('team_id', [fixture.team1Id, fixture.team2Id]);
      const winner = postStats?.find((s) => s.team_id === fixture.team1Id);
      const loser = postStats?.find((s) => s.team_id === fixture.team2Id);
      expect((winner?.match_wins ?? 0) - fixture.preStats[fixture.team1Id].match_wins).toBe(1);
      expect((loser?.match_losses ?? 0) - fixture.preStats[fixture.team2Id].match_losses).toBe(1);
    } finally {
      await cleanupSeededAdminScoreFixture(admin, fixture);
    }
  });
});
