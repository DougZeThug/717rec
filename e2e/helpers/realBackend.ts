import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface RealBackendEnv {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  email: string;
  password: string;
}

export const getRealBackendEnv = (): RealBackendEnv | null => {
  const supabaseUrl = process.env.E2E_SUPABASE_URL;
  const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !email || !password) return null;
  return { supabaseUrl, anonKey, serviceRoleKey, email, password };
};

export const createAdminClient = (env: RealBackendEnv): SupabaseClient =>
  createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Guarantee the shared E2E user exists and has a known password. Idempotent —
// safe to call before every test.
export const ensureTestUser = async (admin: SupabaseClient, env: RealBackendEnv): Promise<void> => {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: env.email,
    password: env.password,
    email_confirm: true,
  });
  if (!error && created?.user) return;
  // Fall back to updating the password on the existing user so a rotated
  // secret still logs in.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === env.email.toLowerCase());
  if (!existing) throw error ?? new Error(`Failed to ensure test user ${env.email}`);
  await admin.auth.admin.updateUserById(existing.id, {
    password: env.password,
    email_confirm: true,
  });
};

// Promote the shared E2E user to admin so admin-gated flows can run.
// Idempotent — safe to re-run.
export const ensureTestUserIsAdmin = async (
  admin: SupabaseClient,
  env: RealBackendEnv
): Promise<void> => {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const user = list?.users?.find((u) => u.email?.toLowerCase() === env.email.toLowerCase());
  if (!user) throw new Error(`Cannot promote missing user ${env.email}`);
  // Ensure a profiles row exists (handle_new_user trigger should have created
  // one, but seed defensively for freshly-provisioned projects).
  await admin.from('profiles').upsert({ id: user.id, is_admin: true }, { onConflict: 'id' });
};

// ---------------------------------------------------------------------------
// Shared safe-delete + suffix helpers
// ---------------------------------------------------------------------------

const safeDelete = async (
  admin: SupabaseClient,
  table: string,
  column: string,
  value: string | string[]
): Promise<void> => {
  const query = admin.from(table).delete();
  const filtered = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
  const { error } = await filtered;
  if (error) {
    // Idempotent: log-and-continue so a partial teardown never wedges reruns.

    console.warn(`[e2e cleanup] ${table}.${column} delete failed: ${error.message}`);
  }
};

export interface SeededMatch {
  matchId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
}

const uniqueSuffix = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const seedPendingMatch = async (admin: SupabaseClient): Promise<SeededMatch> => {
  const suffix = uniqueSuffix();
  const team1Name = `E2E Alpha ${suffix}`;
  const team2Name = `E2E Beta ${suffix}`;

  const { data: teams, error: teamErr } = await admin
    .from('teams')
    .insert([{ name: team1Name }, { name: team2Name }])
    .select('id, name');
  if (teamErr || !teams || teams.length !== 2) throw teamErr ?? new Error('Failed to seed teams');

  const team1 = teams.find((t) => t.name === team1Name);
  const team2 = teams.find((t) => t.name === team2Name);
  if (!team1 || !team2) throw new Error('Seeded teams missing after insert');

  // A pending match: no scores, not completed, dated in the recent past so it
  // shows up in the "Pending Scores" view.
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: match, error: matchErr } = await admin
    .from('matches')
    .insert({
      team1_id: team1.id,
      team2_id: team2.id,
      date,
      location: 'E2E Court',
      iscompleted: false,
    })
    .select('id')
    .single();
  if (matchErr || !match) throw matchErr ?? new Error('Failed to seed pending match');

  return {
    matchId: match.id,
    team1Id: team1.id,
    team2Id: team2.id,
    team1Name,
    team2Name,
  };
};

export const cleanupSeededMatch = async (
  admin: SupabaseClient,
  seeded: SeededMatch
): Promise<void> => {
  await safeDelete(admin, 'score_submissions', 'match_id', seeded.matchId);
  await safeDelete(admin, 'matches', 'id', seeded.matchId);
  await safeDelete(admin, 'teams', 'id', [seeded.team1Id, seeded.team2Id]);
};

// ---------------------------------------------------------------------------
// Season / division helpers (reuse existing rows when possible)
// ---------------------------------------------------------------------------

export interface SeededSeason {
  seasonId: string;
  createdByHelper: boolean;
}

export const ensureActiveSeason = async (admin: SupabaseClient): Promise<SeededSeason> => {
  const { data: existing } = await admin
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { seasonId: existing.id, createdByHelper: false };

  const { data, error } = await admin
    .from('seasons')
    .insert({ name: `E2E Season ${uniqueSuffix()}`, is_active: true })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Failed to seed active season');
  return { seasonId: data.id, createdByHelper: true };
};

export interface SeededDivision {
  divisionId: string;
  divisionName: string;
  createdByHelper: boolean;
}

export const ensureDivision = async (admin: SupabaseClient): Promise<SeededDivision> => {
  const name = `E2E Division ${uniqueSuffix()}`;
  const { data, error } = await admin
    .from('divisions')
    .insert({ name })
    .select('id, name')
    .single();
  if (error || !data) throw error ?? new Error('Failed to seed division');
  return { divisionId: data.id, divisionName: data.name, createdByHelper: true };
};

const cleanupSeasonAndDivision = async (
  admin: SupabaseClient,
  season: SeededSeason | null,
  division: SeededDivision | null
): Promise<void> => {
  if (division?.createdByHelper) await safeDelete(admin, 'divisions', 'id', division.divisionId);
  if (season?.createdByHelper) await safeDelete(admin, 'seasons', 'id', season.seasonId);
};

// ---------------------------------------------------------------------------
// Public schedule fixture
// ---------------------------------------------------------------------------

export interface SeededScheduleFixture {
  season: SeededSeason;
  division: SeededDivision;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  matchId: string;
  timeslotIds: string[];
  matchDate: string; // ISO date (yyyy-mm-dd)
}

export const seedScheduleFixture = async (
  admin: SupabaseClient
): Promise<SeededScheduleFixture> => {
  const season = await ensureActiveSeason(admin);
  const division = await ensureDivision(admin);
  const suffix = uniqueSuffix();
  const team1Name = `E2E Sched Alpha ${suffix}`;
  const team2Name = `E2E Sched Beta ${suffix}`;

  const { data: teams, error: teamErr } = await admin
    .from('teams')
    .insert([
      { name: team1Name, division_id: division.divisionId },
      { name: team2Name, division_id: division.divisionId },
    ])
    .select('id, name');
  if (teamErr || !teams || teams.length !== 2) throw teamErr ?? new Error('schedule teams');
  const team1 = teams.find((t) => t.name === team1Name);
  const team2 = teams.find((t) => t.name === team2Name);
  if (!team1 || !team2) throw new Error('schedule teams lookup failed');

  // Schedule for the near future so it renders in the public schedule view.
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const matchDate = future.toISOString().slice(0, 10);
  const dateIso = future.toISOString();

  const { data: match, error: matchErr } = await admin
    .from('matches')
    .insert({
      team1_id: team1.id,
      team2_id: team2.id,
      date: dateIso,
      location: 'E2E Court',
      iscompleted: false,
      season_id: season.seasonId,
      round_number: 1,
    })
    .select('id')
    .single();
  if (matchErr || !match) throw matchErr ?? new Error('schedule match');

  const { data: slots, error: slotErr } = await admin
    .from('team_timeslots')
    .insert([
      { team_id: team1.id, match_date: matchDate, timeslot: '6:30 PM' },
      { team_id: team2.id, match_date: matchDate, timeslot: '6:30 PM' },
    ])
    .select('id');
  if (slotErr) throw slotErr;

  return {
    season,
    division,
    team1Id: team1.id,
    team2Id: team2.id,
    team1Name,
    team2Name,
    matchId: match.id,
    timeslotIds: (slots ?? []).map((s) => s.id),
    matchDate,
  };
};

export const cleanupSeededScheduleFixture = async (
  admin: SupabaseClient,
  f: SeededScheduleFixture
): Promise<void> => {
  if (f.timeslotIds.length) await safeDelete(admin, 'team_timeslots', 'id', f.timeslotIds);
  await safeDelete(admin, 'score_submissions', 'match_id', f.matchId);
  await safeDelete(admin, 'matches', 'id', f.matchId);
  await safeDelete(admin, 'teams', 'id', [f.team1Id, f.team2Id]);
  await cleanupSeasonAndDivision(admin, f.season, f.division);
};

// ---------------------------------------------------------------------------
// Public standings fixture
// ---------------------------------------------------------------------------

export interface SeededStandingsFixture {
  season: SeededSeason;
  division: SeededDivision;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  matchId: string;
}

export const seedStandingsFixture = async (
  admin: SupabaseClient
): Promise<SeededStandingsFixture> => {
  const season = await ensureActiveSeason(admin);
  const division = await ensureDivision(admin);
  const suffix = uniqueSuffix();
  const team1Name = `E2E Stand Alpha ${suffix}`;
  const team2Name = `E2E Stand Beta ${suffix}`;

  const { data: teams, error: teamErr } = await admin
    .from('teams')
    .insert([
      { name: team1Name, division_id: division.divisionId, wins: 1, losses: 0 },
      { name: team2Name, division_id: division.divisionId, wins: 0, losses: 1 },
    ])
    .select('id, name');
  if (teamErr || !teams || teams.length !== 2) throw teamErr ?? new Error('standings teams');
  const team1 = teams.find((t) => t.name === team1Name);
  const team2 = teams.find((t) => t.name === team2Name);
  if (!team1 || !team2) throw new Error('standings teams lookup failed');

  const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: match, error: matchErr } = await admin
    .from('matches')
    .insert({
      team1_id: team1.id,
      team2_id: team2.id,
      date: past,
      location: 'E2E Court',
      iscompleted: true,
      season_id: season.seasonId,
      round_number: 1,
      team1_score: 1,
      team2_score: 0,
      team1_game_wins: 2,
      team2_game_wins: 0,
      winner_id: team1.id,
      loser_id: team2.id,
    })
    .select('id')
    .single();
  if (matchErr || !match) throw matchErr ?? new Error('standings match');

  // Upsert authoritative season stats so standings render deterministic values
  // regardless of whether background triggers already populated the row.
  const { error: statsErr } = await admin.from('team_season_stats').upsert(
    [
      {
        season_id: season.seasonId,
        team_id: team1.id,
        match_wins: 1,
        match_losses: 0,
        game_wins: 2,
        game_losses: 0,
        division_name: division.divisionName,
      },
      {
        season_id: season.seasonId,
        team_id: team2.id,
        match_wins: 0,
        match_losses: 1,
        game_wins: 0,
        game_losses: 2,
        division_name: division.divisionName,
      },
    ],
    { onConflict: 'season_id,team_id' }
  );
  if (statsErr) throw statsErr;

  return {
    season,
    division,
    team1Id: team1.id,
    team2Id: team2.id,
    team1Name,
    team2Name,
    matchId: match.id,
  };
};

export const cleanupSeededStandingsFixture = async (
  admin: SupabaseClient,
  f: SeededStandingsFixture
): Promise<void> => {
  await safeDelete(admin, 'team_season_stats', 'team_id', [f.team1Id, f.team2Id]);
  await safeDelete(admin, 'matches', 'id', f.matchId);
  await safeDelete(admin, 'teams', 'id', [f.team1Id, f.team2Id]);
  await cleanupSeasonAndDivision(admin, f.season, f.division);
};

// ---------------------------------------------------------------------------
// Public teams-page fixture
// ---------------------------------------------------------------------------

export interface SeededTeamsFixture {
  division: SeededDivision;
  teamIds: string[];
  teamNames: string[];
  playerIds: string[];
}

export const seedTeamsFixture = async (admin: SupabaseClient): Promise<SeededTeamsFixture> => {
  const division = await ensureDivision(admin);
  const suffix = uniqueSuffix();
  const teamNames = [0, 1, 2].map((i) => `E2E Teams ${suffix}-${i}`);

  const { data: teams, error: teamErr } = await admin
    .from('teams')
    .insert(teamNames.map((name) => ({ name, division_id: division.divisionId })))
    .select('id, name');
  if (teamErr || !teams || teams.length !== 3) throw teamErr ?? new Error('teams fixture teams');
  const teamIds = teams.map((t) => t.id);

  const playerRows = teams.flatMap((t) => [
    { team_id: t.id, display_name: `${t.name} P1` },
    { team_id: t.id, display_name: `${t.name} P2` },
  ]);
  const { data: players, error: playerErr } = await admin
    .from('team_players')
    .insert(playerRows)
    .select('id');
  if (playerErr) throw playerErr;

  return {
    division,
    teamIds,
    teamNames,
    playerIds: (players ?? []).map((p) => p.id),
  };
};

export const cleanupSeededTeamsFixture = async (
  admin: SupabaseClient,
  f: SeededTeamsFixture
): Promise<void> => {
  if (f.playerIds.length) await safeDelete(admin, 'team_players', 'id', f.playerIds);
  await safeDelete(admin, 'teams', 'id', f.teamIds);
  await cleanupSeasonAndDivision(admin, null, f.division);
};

// ---------------------------------------------------------------------------
// Admin score-entry fixture
// ---------------------------------------------------------------------------

export interface SeededAdminScoreFixture {
  season: SeededSeason;
  division: SeededDivision;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  matchId: string;
  matchDate: string;
  preStats: Record<string, { match_wins: number; match_losses: number }>;
}

export const seedAdminScoreFixture = async (
  admin: SupabaseClient
): Promise<SeededAdminScoreFixture> => {
  const season = await ensureActiveSeason(admin);
  const division = await ensureDivision(admin);
  const suffix = uniqueSuffix();
  const team1Name = `E2E Admin Alpha ${suffix}`;
  const team2Name = `E2E Admin Beta ${suffix}`;

  const { data: teams, error: teamErr } = await admin
    .from('teams')
    .insert([
      { name: team1Name, division_id: division.divisionId },
      { name: team2Name, division_id: division.divisionId },
    ])
    .select('id, name');
  if (teamErr || !teams || teams.length !== 2) throw teamErr ?? new Error('admin teams');
  const team1 = teams.find((t) => t.name === team1Name);
  const team2 = teams.find((t) => t.name === team2Name);
  if (!team1 || !team2) throw new Error('admin teams lookup failed');

  const when = new Date().toISOString();
  const { data: match, error: matchErr } = await admin
    .from('matches')
    .insert({
      team1_id: team1.id,
      team2_id: team2.id,
      date: when,
      location: 'E2E Court',
      iscompleted: false,
      season_id: season.seasonId,
      round_number: 1,
    })
    .select('id')
    .single();
  if (matchErr || !match) throw matchErr ?? new Error('admin match');

  // Snapshot existing season stats so tests can assert deltas rather than
  // absolute values (parallel seeds could otherwise race the counters).
  const { data: preStatsRows } = await admin
    .from('team_season_stats')
    .select('team_id, match_wins, match_losses')
    .eq('season_id', season.seasonId)
    .in('team_id', [team1.id, team2.id]);
  const preStats: Record<string, { match_wins: number; match_losses: number }> = {
    [team1.id]: { match_wins: 0, match_losses: 0 },
    [team2.id]: { match_wins: 0, match_losses: 0 },
  };
  for (const row of preStatsRows ?? []) {
    preStats[row.team_id] = {
      match_wins: row.match_wins ?? 0,
      match_losses: row.match_losses ?? 0,
    };
  }

  return {
    season,
    division,
    team1Id: team1.id,
    team2Id: team2.id,
    team1Name,
    team2Name,
    matchId: match.id,
    matchDate: when.slice(0, 10),
    preStats,
  };
};

export const cleanupSeededAdminScoreFixture = async (
  admin: SupabaseClient,
  f: SeededAdminScoreFixture
): Promise<void> => {
  await safeDelete(admin, 'score_submissions', 'match_id', f.matchId);
  await safeDelete(admin, 'matches', 'id', f.matchId);
  await safeDelete(admin, 'team_season_stats', 'team_id', [f.team1Id, f.team2Id]);
  await safeDelete(admin, 'teams', 'id', [f.team1Id, f.team2Id]);
  await cleanupSeasonAndDivision(admin, f.season, f.division);
};
