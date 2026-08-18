import { BackupSeasonStatsRow, BackupTeamPowerRow } from '@/services/admin/PowerMigrationService';
import { BulkTeamCareerData } from '@/services/career/CareerService';
import { Team } from '@/types';
import { SeasonStats } from '@/utils/career/types';

import { computeTotalsFromBulkData } from '../career/computeAllTeamsTotals';

export interface PerSeasonComparison {
  seasonId: string;
  seasonName: string;
  /** null when the team has no backup row for this season */
  beforeWins: number | null;
  beforeLosses: number | null;
  /** 0-100 scale (backup rows store 0-1) */
  beforePowerScore: number | null;
  /** null when the team has no live row for this season */
  afterWins: number | null;
  afterLosses: number | null;
  afterPowerScore: number | null;
}

export interface PowerMigrationComparisonRow {
  teamId: string;
  teamName: string;
  divisionName: string | null;
  /** null for teams created after the backup was taken */
  beforeRank: number | null;
  afterRank: number;
  /** beforeRank - afterRank: positive means the team moved UP */
  rankDelta: number | null;
  beforeScore: number | null;
  afterScore: number;
  scoreDelta: number | null;
  isNewSinceBackup: boolean;
  perSeason: PerSeasonComparison[];
}

export interface PowerMigrationComparison {
  backedUpAt: string | null;
  rows: PowerMigrationComparisonRow[];
}

export interface PowerMigrationComparisonInput {
  /** All teams, hidden included — must match what /stats Career Rankings uses */
  teams: Team[];
  /** Live bulk career data from fetchAllTeamsCareerData(teamIds) */
  bulkData: Map<string, BulkTeamCareerData>;
  backupSeasonStats: BackupSeasonStatsRow[];
  backupTeamPower: BackupTeamPowerRow[];
  /**
   * The season that was current when the backup was taken. The backup captures
   * that season TWICE — once as a team_season_stats row and once as the
   * v_team_details current-season power/record row — so the "before" dataset
   * must exclude it from the historical side. When omitted, the live current
   * season is used, which is only correct while the season has not rolled over.
   */
  backupCurrentSeasonId?: string | null;
}

interface SeasonWindow {
  id: string;
  start_date: string | null;
  end_date: string | null;
}

/**
 * Which season was current at `timestamp`. Prefers a season whose window
 * contains the timestamp; otherwise the most recent season that had started.
 */
export function resolveSeasonIdAt(
  seasons: SeasonWindow[],
  timestamp: string | null
): string | null {
  if (!timestamp) return null;
  const at = new Date(timestamp).getTime();
  if (Number.isNaN(at)) return null;

  const started = seasons
    .filter((s) => s.start_date && new Date(s.start_date).getTime() <= at)
    .sort(
      (a, b) =>
        new Date(b.start_date as string).getTime() - new Date(a.start_date as string).getTime()
    );

  const containing = started.find(
    (s) => !s.end_date || new Date(`${s.end_date}T23:59:59Z`).getTime() >= at
  );
  return containing?.id ?? started[0]?.id ?? null;
}

/** Map a backup season row to the SeasonStats shape the career calculators eat. */
function toSeasonStats(row: BackupSeasonStatsRow): SeasonStats {
  return {
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
    seasons: { name: row.season_name ?? 'Unknown Season' },
    season_id: row.season_id,
  };
}

/** Rank teams by career power score descending (name as a stable tie-break). */
function rankByScore(scores: Map<string, { name: string; score: number }>): Map<string, number> {
  const sorted = [...scores.entries()].sort(
    (a, b) => b[1].score - a[1].score || a[1].name.localeCompare(b[1].name)
  );
  return new Map(sorted.map(([teamId], index) => [teamId, index + 1]));
}

/**
 * Builds the before/after Career Standings comparison for the power-score
 * migration review tab. Pure: everything is computed from the inputs.
 *
 * AFTER runs the real career calculators over the live data, exactly like
 * /stats. BEFORE runs the same calculators with the database-derived inputs
 * (per-season stats and current-season power) swapped for the backup taken
 * before the migration. Matches, brackets and division maps are shared — the
 * migration only changed how power scores are derived, not those tables — so
 * games played after the backup appear on both sides.
 */
export async function buildPowerMigrationComparison({
  teams,
  bulkData,
  backupSeasonStats,
  backupTeamPower,
  backupCurrentSeasonId,
}: PowerMigrationComparisonInput): Promise<PowerMigrationComparison> {
  const backupSeasonsByTeam = new Map<string, BackupSeasonStatsRow[]>();
  for (const row of backupSeasonStats) {
    // Backup rows for teams deleted since (not in `teams`) are dropped here.
    let list = backupSeasonsByTeam.get(row.team_id);
    if (!list) {
      list = [];
      backupSeasonsByTeam.set(row.team_id, list);
    }
    list.push(row);
  }
  const backupPowerByTeam = new Map(backupTeamPower.map((row) => [row.team_id, row]));

  const backedUpAt = backupSeasonStats[0]?.backed_up_at ?? backupTeamPower[0]?.backed_up_at ?? null;

  const afterScores = new Map<string, { name: string; score: number }>();
  const beforeScores = new Map<string, { name: string; score: number }>();
  const details = new Map<
    string,
    { team: Team; isNewSinceBackup: boolean; perSeason: PerSeasonComparison[] }
  >();

  await Promise.all(
    teams.map(async (team) => {
      const liveData = bulkData.get(team.id);
      if (!liveData) return;

      const livePower = {
        power_score: team.power_score ?? null,
        wins: team.wins ?? null,
        losses: team.losses ?? null,
      };
      const afterTotals = await computeTotalsFromBulkData(team.id, liveData, livePower);
      afterScores.set(team.id, { name: team.name, score: afterTotals.career_power_score });

      const teamBackupSeasons = backupSeasonsByTeam.get(team.id) ?? [];
      const teamBackupPower = backupPowerByTeam.get(team.id) ?? null;
      const isNewSinceBackup = teamBackupSeasons.length === 0 && !teamBackupPower;

      if (!isNewSinceBackup) {
        const backupPowerScores: BulkTeamCareerData['seasonPowerScores'] = [];
        for (const row of teamBackupSeasons) {
          if (row.power_score !== null) {
            backupPowerScores.push({
              power_score: row.power_score,
              match_wins: row.match_wins,
              match_losses: row.match_losses,
              season_id: row.season_id,
            });
          }
        }
        const beforeData: BulkTeamCareerData = {
          ...liveData,
          // Never inherit the live (review-time) current season: if the season
          // rolled over since the backup, the backup-time current season would
          // be counted both as historical and as the current contribution.
          currentSeasonId: backupCurrentSeasonId ?? liveData.currentSeasonId,
          seasonStats: teamBackupSeasons.map(toSeasonStats),
          seasonPowerScores: backupPowerScores,
        };
        const beforePower = teamBackupPower
          ? {
              power_score: teamBackupPower.power_score,
              wins: teamBackupPower.wins,
              losses: teamBackupPower.losses,
            }
          : null;
        const beforeTotals = await computeTotalsFromBulkData(team.id, beforeData, beforePower);
        beforeScores.set(team.id, { name: team.name, score: beforeTotals.career_power_score });
      }

      // Per-season detail: union of the seasons on either side.
      const liveBySeason = new Map<string, SeasonStats>();
      for (const s of liveData.seasonStats ?? []) {
        if (s.season_id) liveBySeason.set(s.season_id, s);
      }
      const seasonIds = [
        ...new Set([...teamBackupSeasons.map((row) => row.season_id), ...liveBySeason.keys()]),
      ];
      const perSeason: PerSeasonComparison[] = seasonIds.map((seasonId) => {
        const backup = teamBackupSeasons.find((row) => row.season_id === seasonId) ?? null;
        const live = liveBySeason.get(seasonId) ?? null;
        return {
          seasonId,
          seasonName: backup?.season_name ?? live?.seasons?.name ?? 'Unknown Season',
          beforeWins: backup?.match_wins ?? null,
          beforeLosses: backup?.match_losses ?? null,
          beforePowerScore: backup?.power_score != null ? backup.power_score * 100 : null,
          afterWins: live?.match_wins ?? null,
          afterLosses: live?.match_losses ?? null,
          afterPowerScore: live?.power_score != null ? live.power_score * 100 : null,
        };
      });

      details.set(team.id, { team, isNewSinceBackup, perSeason });
    })
  );

  const afterRanks = rankByScore(afterScores);
  const beforeRanks = rankByScore(beforeScores);

  const rows: PowerMigrationComparisonRow[] = [...afterScores.entries()].map(([teamId, after]) => {
    const detail = details.get(teamId);
    const before = beforeScores.get(teamId) ?? null;
    const beforeRank = beforeRanks.get(teamId) ?? null;
    const afterRank = afterRanks.get(teamId) as number;
    return {
      teamId,
      teamName: after.name,
      divisionName: detail?.team.divisionName ?? null,
      beforeRank,
      afterRank,
      rankDelta: beforeRank !== null ? beforeRank - afterRank : null,
      beforeScore: before?.score ?? null,
      afterScore: after.score,
      scoreDelta: before ? after.score - before.score : null,
      isNewSinceBackup: detail?.isNewSinceBackup ?? false,
      perSeason: detail?.perSeason ?? [],
    };
  });

  rows.sort((a, b) => a.afterRank - b.afterRank);
  return { backedUpAt, rows };
}
