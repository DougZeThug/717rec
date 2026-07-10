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
export const ensureTestUser = async (
  admin: SupabaseClient,
  env: RealBackendEnv
): Promise<void> => {
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
  if (teamErr || !teams || teams.length !== 2)
    throw teamErr ?? new Error('Failed to seed teams');

  const team1 = teams.find((t) => t.name === team1Name)!;
  const team2 = teams.find((t) => t.name === team2Name)!;

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
  await admin.from('score_submissions').delete().eq('match_id', seeded.matchId);
  await admin.from('matches').delete().eq('id', seeded.matchId);
  await admin.from('teams').delete().in('id', [seeded.team1Id, seeded.team2Id]);
};