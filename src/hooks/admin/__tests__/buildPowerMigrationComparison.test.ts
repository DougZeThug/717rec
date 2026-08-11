import { describe, expect, it } from 'vitest';

import { BackupSeasonStatsRow, BackupTeamPowerRow } from '@/services/admin/PowerMigrationService';
import { BulkTeamCareerData } from '@/services/career/CareerService';
import { Team } from '@/types';

import { buildPowerMigrationComparison } from '../buildPowerMigrationComparison';

// Fixtures run through the REAL career calculators (no mocks): one archived
// season ('s1') plus the current season ('s2') represented by the
// v_team_details-style numbers on the Team object. Weighted-average math:
// career score = (season power×100×season matches + current power×current
// matches) / total matches. No championships or playoff games → no bonuses.

const BACKED_UP_AT = '2026-08-09T12:00:00Z';

const bulk = (seasonPower: number | null): BulkTeamCareerData => ({
  teamData: { divisions: { division_weight: 1.0 } },
  seasonStats:
    seasonPower === null
      ? []
      : [
          {
            match_wins: 8,
            match_losses: 2,
            game_wins: 20,
            game_losses: 10,
            champion: false,
            runner_up: false,
            playoff_rank: null,
            sos: 0.9,
            division_name: 'Competitive',
            power_score: seasonPower,
            seasons: { name: 'Season 1' },
            season_id: 's1',
          },
        ],
  currentMatches: [],
  archivedMatches: [],
  playoffMatches: [],
  teamDivisionMap: new Map(),
  bracketDivisionWeights: {},
  bracketDivisionDisplayNames: {},
  bracketSeasonMap: {},
  teamDivisionWeight: 1.0,
  currentSeasonId: 's2',
  seasonPowerScores:
    seasonPower === null
      ? []
      : [{ power_score: seasonPower, match_wins: 8, match_losses: 2, season_id: 's1' }],
});

const backupSeason = (teamId: string, powerScore: number): BackupSeasonStatsRow => ({
  season_id: 's1',
  team_id: teamId,
  match_wins: 8,
  match_losses: 2,
  game_wins: 20,
  game_losses: 10,
  division_name: 'Competitive',
  playoff_rank: null,
  power_score: powerScore,
  sos: 0.9,
  champion: false,
  runner_up: false,
  recorded_at: BACKED_UP_AT,
  backed_up_at: BACKED_UP_AT,
  season_name: 'Season 1',
});

const backupPower = (teamId: string, powerScore: number): BackupTeamPowerRow => ({
  team_id: teamId,
  power_score: powerScore,
  wins: 2,
  losses: 0,
  game_wins: 5,
  game_losses: 1,
  win_percentage: 1,
  game_win_percentage: 0.8,
  backed_up_at: BACKED_UP_AT,
});

const teams: Team[] = [
  // After: (70×10 + 70×2)/12 = 70 — was (90×10 + 90×2)/12 = 90 before
  { id: 'a', name: 'Alpha', divisionName: 'Competitive', power_score: 70, wins: 2, losses: 0 },
  // After: (85×10 + 85×2)/12 = 85 — was 80 before → overtakes Alpha
  { id: 'b', name: 'Bravo', divisionName: 'Competitive', power_score: 85, wins: 2, losses: 0 },
  // No backup rows at all: created after the backup was taken
  { id: 'c', name: 'Charlie', divisionName: 'Recreational', power_score: 60, wins: 1, losses: 1 },
];

const buildInput = () => ({
  teams,
  bulkData: new Map<string, BulkTeamCareerData>([
    ['a', bulk(0.7)],
    ['b', bulk(0.85)],
    ['c', bulk(null)],
  ]),
  backupSeasonStats: [
    backupSeason('a', 0.9),
    backupSeason('b', 0.8),
    // Orphan row for a team deleted since the backup — must be ignored
    backupSeason('zz-deleted', 0.99),
  ],
  backupTeamPower: [backupPower('a', 90), backupPower('b', 80)],
});

describe('buildPowerMigrationComparison', () => {
  it('detects the rank swap with correct scores and deltas', async () => {
    const { rows, backedUpAt } = await buildPowerMigrationComparison(buildInput());

    expect(backedUpAt).toBe(BACKED_UP_AT);
    expect(rows.map((r) => r.teamId)).toEqual(['b', 'a', 'c']); // sorted by after-rank

    const bravo = rows[0];
    expect(bravo.beforeRank).toBe(2);
    expect(bravo.afterRank).toBe(1);
    expect(bravo.rankDelta).toBe(1); // moved up one spot
    expect(bravo.beforeScore).toBeCloseTo(80, 6);
    expect(bravo.afterScore).toBeCloseTo(85, 6);
    expect(bravo.scoreDelta).toBeCloseTo(5, 6);

    const alpha = rows[1];
    expect(alpha.beforeRank).toBe(1);
    expect(alpha.afterRank).toBe(2);
    expect(alpha.rankDelta).toBe(-1);
    expect(alpha.beforeScore).toBeCloseTo(90, 6);
    expect(alpha.afterScore).toBeCloseTo(70, 6);
    expect(alpha.scoreDelta).toBeCloseTo(-20, 6);
    expect(alpha.isNewSinceBackup).toBe(false);
  });

  it('flags teams created after the backup and excludes them from the before ranking', async () => {
    const { rows } = await buildPowerMigrationComparison(buildInput());

    const charlie = rows[2];
    expect(charlie.teamId).toBe('c');
    expect(charlie.isNewSinceBackup).toBe(true);
    expect(charlie.beforeRank).toBeNull();
    expect(charlie.beforeScore).toBeNull();
    expect(charlie.rankDelta).toBeNull();
    expect(charlie.scoreDelta).toBeNull();
    expect(charlie.afterRank).toBe(3);

    // The orphan backup row of the deleted team never surfaces
    expect(rows.some((r) => r.teamId === 'zz-deleted')).toBe(false);
    // ...and does not shift the before-ranking of surviving teams
    expect(rows.find((r) => r.teamId === 'a')?.beforeRank).toBe(1);
  });

  it('builds per-season detail on the 0-100 display scale', async () => {
    const { rows } = await buildPowerMigrationComparison(buildInput());

    const alpha = rows.find((r) => r.teamId === 'a');
    expect(alpha?.perSeason).toHaveLength(1);
    const s1 = alpha?.perSeason[0];
    expect(s1?.seasonId).toBe('s1');
    expect(s1?.seasonName).toBe('Season 1');
    expect(s1?.beforeWins).toBe(8);
    expect(s1?.afterWins).toBe(8);
    expect(s1?.beforePowerScore).toBeCloseTo(90, 6);
    expect(s1?.afterPowerScore).toBeCloseTo(70, 6);

    // Charlie has no season history on either side
    expect(rows.find((r) => r.teamId === 'c')?.perSeason).toEqual([]);
  });
});
