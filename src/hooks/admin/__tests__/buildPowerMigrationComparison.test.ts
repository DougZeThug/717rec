import { describe, expect, it, vi } from 'vitest';

import { BackupSeasonStatsRow, BackupTeamPowerRow } from '@/services/admin/PowerMigrationService';
import { BulkTeamCareerData } from '@/services/career/CareerBulkFetchService';
import { Team } from '@/types';

import { buildPowerMigrationComparison } from '../buildPowerMigrationComparison';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

// These fixtures run through the REAL career calculators. With no active
// season, no championships and no playoff games, the career power score is
// exactly the match-weighted average of team_season_stats.power_score * 100 —
// so the expected values below are exact, not approximations.

const team = (id: string, name: string): Team =>
  ({
    id,
    name,
    divisionName: 'Competitive',
    power_score: null,
    wins: 0,
    losses: 0,
  }) as unknown as Team;

const liveSeasonRow = (powerScore: number) => ({
  match_wins: 6,
  match_losses: 4,
  game_wins: 12,
  game_losses: 8,
  champion: false,
  runner_up: false,
  playoff_rank: null,
  sos: 0.9,
  division_name: 'Competitive',
  power_score: powerScore,
  season_id: 's-1',
  seasons: { name: 'Season 1' },
});

const bulk = (powerScore: number): BulkTeamCareerData => ({
  teamData: { divisions: { division_weight: 1.0 } },
  seasonStats: [liveSeasonRow(powerScore)],
  currentMatches: [],
  archivedMatches: [],
  playoffMatches: [],
  teamDivisionMap: new Map(),
  bracketDivisionWeights: {},
  bracketDivisionDisplayNames: {},
  bracketSeasonMap: {},
  teamDivisionWeight: 1.0,
  currentSeasonId: null,
  seasonPowerScores: [
    { power_score: powerScore, match_wins: 6, match_losses: 4, season_id: 's-1' },
  ],
});

const backupSeasonRow = (teamId: string, powerScore: number): BackupSeasonStatsRow => ({
  team_id: teamId,
  season_id: 's-1',
  season_name: 'Season 1',
  match_wins: 5,
  match_losses: 5,
  game_wins: 11,
  game_losses: 9,
  sos: 0.9,
  power_score: powerScore,
  division_name: 'Competitive',
  champion: false,
  runner_up: false,
  playoff_rank: null,
  backed_up_at: '2026-08-10T12:00:00Z',
});

const backupPowerRow = (teamId: string): BackupTeamPowerRow => ({
  team_id: teamId,
  power_score: null,
  wins: 0,
  losses: 0,
  game_wins: 0,
  game_losses: 0,
  win_percentage: 0,
  game_win_percentage: 0,
  backed_up_at: '2026-08-10T12:00:00Z',
});

describe('buildPowerMigrationComparison', () => {
  it('swaps ranks when the migration reorders career power scores', async () => {
    const teams = [team('a', 'Alpha'), team('b', 'Bravo')];
    const bulkData = new Map([
      ['a', bulk(0.4)], // after: 40
      ['b', bulk(0.6)], // after: 60
    ]);
    const backupSeasons = [
      backupSeasonRow('a', 0.8), // before: 80
      backupSeasonRow('b', 0.5), // before: 50
    ];

    const rows = await buildPowerMigrationComparison(teams, bulkData, backupSeasons, [
      backupPowerRow('a'),
      backupPowerRow('b'),
    ]);

    // Sorted by after-rank: Bravo first now.
    expect(rows.map((r) => r.teamName)).toEqual(['Bravo', 'Alpha']);

    const bravo = rows[0];
    expect(bravo.beforeRank).toBe(2);
    expect(bravo.afterRank).toBe(1);
    expect(bravo.rankDelta).toBe(1); // moved up
    expect(bravo.beforeScore).toBeCloseTo(50, 5);
    expect(bravo.afterScore).toBeCloseTo(60, 5);
    expect(bravo.scoreDelta).toBeCloseTo(10, 5);

    const alpha = rows[1];
    expect(alpha.beforeRank).toBe(1);
    expect(alpha.afterRank).toBe(2);
    expect(alpha.rankDelta).toBe(-1); // moved down
    expect(alpha.scoreDelta).toBeCloseTo(-40, 5);
    expect(alpha.isNewSinceBackup).toBe(false);
  });

  it('flags teams with no backup rows as new and excludes them from the before ranking', async () => {
    const teams = [team('a', 'Alpha'), team('c', 'Charlie')];
    const bulkData = new Map([
      ['a', bulk(0.4)],
      ['c', bulk(0.3)],
    ]);

    const rows = await buildPowerMigrationComparison(
      teams,
      bulkData,
      [backupSeasonRow('a', 0.8)],
      [backupPowerRow('a')]
    );

    const charlie = rows.find((r) => r.teamId === 'c')!;
    expect(charlie.isNewSinceBackup).toBe(true);
    expect(charlie.beforeRank).toBeNull();
    expect(charlie.beforeScore).toBeNull();
    expect(charlie.rankDelta).toBeNull();
    expect(charlie.scoreDelta).toBeNull();
    expect(charlie.afterRank).toBe(2);

    // Alpha is the only team in the before ranking.
    const alpha = rows.find((r) => r.teamId === 'a')!;
    expect(alpha.beforeRank).toBe(1);
  });

  it('joins per-season detail by season and reports both scales as 0-100', async () => {
    const teams = [team('a', 'Alpha')];
    const bulkData = new Map([['a', bulk(0.4)]]);

    const rows = await buildPowerMigrationComparison(
      teams,
      bulkData,
      [backupSeasonRow('a', 0.8)],
      [backupPowerRow('a')]
    );

    expect(rows[0].perSeason).toEqual([
      {
        seasonId: 's-1',
        seasonName: 'Season 1',
        beforePower: 80,
        afterPower: 40,
        beforeRecord: '5-5',
        afterRecord: '6-4',
      },
    ]);
  });

  it('ignores orphan backup rows for teams that no longer exist', async () => {
    const teams = [team('a', 'Alpha')];
    const bulkData = new Map([['a', bulk(0.4)]]);

    const rows = await buildPowerMigrationComparison(
      teams,
      bulkData,
      [backupSeasonRow('a', 0.8), backupSeasonRow('deleted-team', 0.9)],
      [backupPowerRow('a')]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].teamId).toBe('a');
    expect(rows[0].beforeRank).toBe(1);
  });

  it('skips teams without bulk data (mirrors computeAllTeamsTotals)', async () => {
    const teams = [team('a', 'Alpha'), team('x', 'Xray')];
    const bulkData = new Map([['a', bulk(0.4)]]);

    const rows = await buildPowerMigrationComparison(teams, bulkData, [], []);
    expect(rows.map((r) => r.teamId)).toEqual(['a']);
  });
});
