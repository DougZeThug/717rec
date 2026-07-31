import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { buildRankingSnapshots, captureRankingSnapshots, compareTeamsForRanking } from './index.ts';

type Row = {
  team_id: string;
  name: string | null;
  divisionname: string | null;
  win_percentage: number | null;
  power_score: number | null;
};

const team = (overrides: Partial<Row> & { team_id: string }): Row => ({
  name: overrides.team_id,
  divisionname: 'Intermediate',
  win_percentage: 0.5,
  power_score: 50,
  ...overrides,
});

// Minimal stand-in for the supabase-js client: records which table each client
// touched so a test can prove the read went to the anon client and the write to
// the service-role one.
const fakeClient = (rows: Row[] | null, error: unknown = null) => {
  const tables: string[] = [];
  let upserted: unknown = null;
  const client = {
    tables,
    get upserted() {
      return upserted;
    },
    from(table: string) {
      tables.push(table);
      return {
        select: () => Promise.resolve({ data: rows, error }),
        upsert: (values: unknown) => {
          upserted = values;
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return client;
};

Deno.test('buildRankingSnapshots numbers teams 1..N in sorted order', () => {
  const snapshots = buildRankingSnapshots(
    [
      team({ team_id: 'low', power_score: 10 }),
      team({ team_id: 'high', power_score: 90 }),
      team({ team_id: 'mid', power_score: 50 }),
    ],
    'season-1'
  );

  assertEquals(
    snapshots.map((s) => s.team_id),
    ['high', 'mid', 'low']
  );
  assertEquals(
    snapshots.map((s) => s.rank_position),
    [1, 2, 3]
  );
  assertEquals(new Set(snapshots.map((s) => s.season_id)).size, 1);
  assertEquals(snapshots[0].season_id, 'season-1');
});

Deno.test('buildRankingSnapshots sorts NULL power scores last', () => {
  const snapshots = buildRankingSnapshots(
    [
      team({ team_id: 'no-matches', power_score: null }),
      team({ team_id: 'played', power_score: 1 }),
    ],
    'season-1'
  );

  assertEquals(
    snapshots.map((s) => s.team_id),
    ['played', 'no-matches']
  );
});

Deno.test('compareTeamsForRanking breaks power-score ties by division tier', () => {
  const rec = team({ team_id: 'rec', divisionname: 'Recreational' });
  const comp = team({ team_id: 'comp', divisionname: 'Competitive' });
  assertEquals(compareTeamsForRanking(comp, rec) < 0, true);
});

Deno.test('compareTeamsForRanking rounds power score to one decimal before comparing', () => {
  // 50.01 and 50.04 both display as 50.0, so the division tier decides.
  const a = team({ team_id: 'a', power_score: 50.01, divisionname: 'Competitive' });
  const b = team({ team_id: 'b', power_score: 50.04, divisionname: 'Recreational' });
  assertEquals(compareTeamsForRanking(a, b) < 0, true);
});

Deno.test(
  'captureRankingSnapshots reads with the read client and writes with the write client',
  async () => {
    const readClient = fakeClient([
      team({ team_id: 'b', power_score: 10 }),
      team({ team_id: 'a', power_score: 90 }),
    ]);
    const writeClient = fakeClient([]);

    await captureRankingSnapshots(readClient, writeClient, 'season-1');

    // The team list must come from the RLS-respecting client, never the service one.
    assertEquals(readClient.tables, ['v_team_details']);
    assertEquals(writeClient.tables, ['ranking_snapshots']);
    assertEquals(writeClient.upserted, [
      { team_id: 'a', season_id: 'season-1', rank_position: 1 },
      { team_id: 'b', season_id: 'season-1', rank_position: 2 },
    ]);
  }
);

Deno.test('captureRankingSnapshots ranks only the rows the read client returned', async () => {
  // Simulates RLS hiding an opted-out team: it is absent from the read, so the
  // team that follows it must be rank 2, not rank 3.
  const readClient = fakeClient([
    team({ team_id: 'top', power_score: 90 }),
    team({ team_id: 'below-opted-out', power_score: 10 }),
  ]);
  const writeClient = fakeClient([]);

  await captureRankingSnapshots(readClient, writeClient, 'season-1');

  assertEquals(writeClient.upserted, [
    { team_id: 'top', season_id: 'season-1', rank_position: 1 },
    { team_id: 'below-opted-out', season_id: 'season-1', rank_position: 2 },
  ]);
});

Deno.test('captureRankingSnapshots writes nothing when there are no teams', async () => {
  const writeClient = fakeClient([]);
  await captureRankingSnapshots(fakeClient([]), writeClient, 'season-1');
  assertEquals(writeClient.tables, []);
  assertEquals(writeClient.upserted, null);
});

Deno.test('captureRankingSnapshots swallows read errors without writing', async () => {
  const writeClient = fakeClient([]);
  await captureRankingSnapshots(fakeClient(null, new Error('boom')), writeClient, 'season-1');
  assertEquals(writeClient.tables, []);
  assertEquals(writeClient.upserted, null);
});
