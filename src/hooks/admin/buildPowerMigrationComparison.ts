import { computeTotalsFromBulkData } from '@/hooks/career/computeAllTeamsTotals';
import { BackupSeasonStatsRow, BackupTeamPowerRow } from '@/services/admin/PowerMigrationService';
import { BulkTeamCareerData } from '@/services/career/CareerBulkFetchService';
import { Team } from '@/types';
import { SeasonStats } from '@/utils/career/types';
import { errorLog } from '@/utils/logger';

export interface PowerMigrationSeasonDelta {
  seasonId: string;
  seasonName: string;
  /** 0-100 scale, null when the team had no rated games that season */
  beforePower: number | null;
  afterPower: number | null;
  beforeRecord: string | null;
  afterRecord: string | null;
}

export interface PowerMigrationComparisonRow {
  teamId: string;
  teamName: string;
  divisionName: string | null;
  /** null for teams created after the backup was taken */
  beforeRank: number | null;
  afterRank: number;
  /** positive = the team moved UP because of the migration */
  rankDelta: number | null;
  beforeScore: number | null;
  afterScore: number;
  scoreDelta: number | null;
  isNewSinceBackup: boolean;
  perSeason: PowerMigrationSeasonDelta[];
}

const formatRecord = (
  wins: number | null | undefined,
  losses: number | null | undefined
): string | null => (wins == null && losses == null ? null : `${wins ?? 0}-${losses ?? 0}`);

/**
 * Maps a backed-up team_season_stats row onto the SeasonStats shape the live
 * career calculators consume (mirrors RawSeasonStatsRow minus team_id).
 */
const toSeasonStats = (row: BackupSeasonStatsRow): SeasonStats => ({
  match_wins: row.match_wins,
  match_losses: row.match_losses,
  game_wins: row.game_wins,
  game_losses: row.game_losses,
  champion: row.champion,
  runner_up: row.runner_up,
  playoff_rank: row.playoff_rank,
  sos: row.sos,
  division_name: row.division_name,
  power_score: row.power_score,
  season_id: row.season_id,
  seasons: row.season_name ? { name: row.season_name } : null,
});

const rankByScore = (
  entries: { teamId: string; teamName: string; score: number }[]
): Map<string, number> => {
  const sorted = [...entries].sort(
    (a, b) => b.score - a.score || a.teamName.localeCompare(b.teamName)
  );
  return new Map(sorted.map((entry, index) => [entry.teamId, index + 1]));
};

/**
 * Builds the before/after Career Standings comparison.
 *
 * BEFORE and AFTER both run through computeTotalsFromBulkData — the exact
 * engine behind the /stats Career Statistics table — so the ranks here are the
 * real page ranks, not an approximation. The migration only changes two data
 * sources, and only those two are substituted for the BEFORE side:
 *   - seasonStats / seasonPowerScores: backup team_season_stats rows
 *   - the current-season power/record: the backup v_team_details row
 * Raw match history (matches, playoff_matches, division maps) is shared, since
 * the migration does not touch those tables.
 */
export async function buildPowerMigrationComparison(
  teams: Team[],
  bulkData: Map<string, BulkTeamCareerData>,
  backupSeasonRows: BackupSeasonStatsRow[],
  backupPowerRows: BackupTeamPowerRow[]
): Promise<PowerMigrationComparisonRow[]> {
  const backupSeasonByTeam = new Map<string, BackupSeasonStatsRow[]>();
  for (const row of backupSeasonRows) {
    const list = backupSeasonByTeam.get(row.team_id);
    if (list) list.push(row);
    else backupSeasonByTeam.set(row.team_id, [row]);
  }
  const backupPowerByTeam = new Map(backupPowerRows.map((row) => [row.team_id, row]));

  const results = new Map<
    string,
    { before: number | null; after: number; perSeason: PowerMigrationSeasonDelta[] }
  >();

  await Promise.all(
    teams.map(async (team) => {
      const data = bulkData.get(team.id);
      if (!data) return;

      const backupSeasons = backupSeasonByTeam.get(team.id) ?? [];
      const backupPower = backupPowerByTeam.get(team.id) ?? null;
      // Teams deleted since the backup leave orphan backup rows; keying off the
      // live team list ignores them. Teams created after the backup have no
      // backup rows at all and get no BEFORE side.
      const isNewSinceBackup = backupSeasons.length === 0 && !backupPower;

      try {
        const afterTotals = await computeTotalsFromBulkData(team.id, data, {
          power_score: team.power_score ?? null,
          wins: team.wins ?? null,
          losses: team.losses ?? null,
        });

        let beforeScore: number | null = null;
        if (!isNewSinceBackup) {
          const beforeData: BulkTeamCareerData = {
            ...data,
            seasonStats: backupSeasons.map(toSeasonStats),
            seasonPowerScores: backupSeasons
              .filter((row) => row.power_score !== null)
              .map((row) => ({
                power_score: row.power_score,
                match_wins: row.match_wins,
                match_losses: row.match_losses,
                season_id: row.season_id,
              })),
          };
          const beforeTotals = await computeTotalsFromBulkData(team.id, beforeData, {
            power_score: backupPower?.power_score ?? null,
            wins: backupPower?.wins ?? null,
            losses: backupPower?.losses ?? null,
          });
          beforeScore = beforeTotals.career_power_score;
        }

        // Per-season detail: join backup rows to live rows by season, so the
        // admin can see exactly which seasons moved. Stored power is 0-1 scale.
        const liveSeasonById = new Map(
          (data.seasonStats ?? [])
            .filter((row) => row.season_id)
            .map((row) => [row.season_id as string, row])
        );
        const seasonIds = new Set<string>([
          ...backupSeasons.map((row) => row.season_id).filter((id): id is string => !!id),
          ...liveSeasonById.keys(),
        ]);
        const perSeason: PowerMigrationSeasonDelta[] = [...seasonIds].map((seasonId) => {
          const backup = backupSeasons.find((row) => row.season_id === seasonId) ?? null;
          const live = liveSeasonById.get(seasonId) ?? null;
          return {
            seasonId,
            seasonName: backup?.season_name ?? live?.seasons?.name ?? 'Unknown Season',
            beforePower: backup?.power_score != null ? backup.power_score * 100 : null,
            afterPower: live?.power_score != null ? live.power_score * 100 : null,
            beforeRecord: backup ? formatRecord(backup.match_wins, backup.match_losses) : null,
            afterRecord: live ? formatRecord(live.match_wins, live.match_losses) : null,
          };
        });
        perSeason.sort((a, b) => a.seasonName.localeCompare(b.seasonName));

        results.set(team.id, {
          before: beforeScore,
          after: afterTotals.career_power_score,
          perSeason,
        });
      } catch (error) {
        errorLog(`Error computing migration comparison for team ${team.id}:`, error);
      }
    })
  );

  const afterRanks = rankByScore(
    teams
      .filter((team) => results.has(team.id))
      .map((team) => ({ teamId: team.id, teamName: team.name, score: results.get(team.id)!.after }))
  );
  const beforeRanks = rankByScore(
    teams
      .filter((team) => results.get(team.id)?.before != null)
      .map((team) => ({
        teamId: team.id,
        teamName: team.name,
        score: results.get(team.id)!.before!,
      }))
  );

  const rows: PowerMigrationComparisonRow[] = [];
  for (const team of teams) {
    const result = results.get(team.id);
    if (!result) continue;

    const beforeRank = beforeRanks.get(team.id) ?? null;
    const afterRank = afterRanks.get(team.id)!;
    rows.push({
      teamId: team.id,
      teamName: team.name,
      divisionName: team.divisionName ?? null,
      beforeRank,
      afterRank,
      rankDelta: beforeRank != null ? beforeRank - afterRank : null,
      beforeScore: result.before,
      afterScore: result.after,
      scoreDelta: result.before != null ? result.after - result.before : null,
      isNewSinceBackup: result.before == null,
      perSeason: result.perSeason,
    });
  }

  return rows.sort((a, b) => a.afterRank - b.afterRank);
}
