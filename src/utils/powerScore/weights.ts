/**
 * TypeScript mirror of the SQL power score formula.
 *
 * The database is the source of truth: power_score_100() and
 * power_score_100_career() are generated from the latest
 * power_score_weight_history row (see migration
 * 20260820120000_power_score_weight_sandbox.sql). This mirror exists so the
 * admin sandbox can preview a weight change client-side without touching
 * stored scores. Fixture triples in weights.test.ts are asserted against the
 * same values in supabase/tests/power_score_weight_sandbox.sql, so the two
 * implementations cannot drift silently.
 *
 * Inputs are on the 0-1 scale (weighted_win_pct, sos, weighted_game_win_pct
 * from v_power_score_components[_current]); output is 0-100.
 */

export interface PowerScoreWeights {
  /** Points handed out for the weighted match win rate */
  win: number;
  /** Points handed out for strength of schedule */
  sos: number;
  /** Points handed out for the weighted game win rate */
  game: number;
}

/** The seeded baseline — only a fallback while the sandbox migration is not applied. */
export const DEFAULT_POWER_SCORE_WEIGHTS: PowerScoreWeights = { win: 40, sos: 45, game: 15 };

/**
 * Career floor: below this performance (0-1), SOS points scale away linearly.
 * A constant in both implementations — the sandbox only varies the weights.
 */
export const CAREER_SCHEDULE_FLOOR = 0.3;

/** COALESCE rules shared with the SQL: missing win/game rates read as 0, missing SOS as 0.5. */
const coalesce = (
  weightedWinPct: number | null | undefined,
  sos: number | null | undefined,
  weightedGameWinPct: number | null | undefined
) => ({
  win: weightedWinPct ?? 0,
  sos: sos ?? 0.5,
  game: weightedGameWinPct ?? 0,
});

/** Standings / season power score — mirrors SQL power_score_100(). No floor. */
export function powerScore100(
  weightedWinPct: number | null | undefined,
  sos: number | null | undefined,
  weightedGameWinPct: number | null | undefined,
  weights: PowerScoreWeights = DEFAULT_POWER_SCORE_WEIGHTS
): number {
  const v = coalesce(weightedWinPct, sos, weightedGameWinPct);
  return v.win * weights.win + v.game * weights.game + v.sos * weights.sos;
}

/**
 * Career power score — mirrors SQL power_score_100_career(). Same weights,
 * but the SOS points are multiplied by min(1, performance / 0.30) so a team
 * that rarely wins cannot bank a hard schedule over many seasons. The
 * performance denominator is DERIVED (win + game weights), never a
 * hardcoded 55, so it follows whatever triple the admin picks.
 */
export function powerScore100Career(
  weightedWinPct: number | null | undefined,
  sos: number | null | undefined,
  weightedGameWinPct: number | null | undefined,
  weights: PowerScoreWeights = DEFAULT_POWER_SCORE_WEIGHTS
): number {
  const v = coalesce(weightedWinPct, sos, weightedGameWinPct);
  const performance = (v.win * weights.win + v.game * weights.game) / (weights.win + weights.game);
  const scheduleCredit = Math.min(1, performance / CAREER_SCHEDULE_FLOOR);
  return v.win * weights.win + v.game * weights.game + v.sos * weights.sos * scheduleCredit;
}

/**
 * The same rules admin_set_power_score_weights() enforces server-side:
 * all finite and non-negative, summing to 100 (float tolerance — the RPC
 * receives the decimal values exactly), and win + game > 0 because the
 * career variant divides by that sum.
 */
export function isValidWeights(weights: PowerScoreWeights): boolean {
  const values = [weights.win, weights.sos, weights.game];
  if (!values.every((v) => Number.isFinite(v) && v >= 0)) return false;
  if (Math.abs(weights.win + weights.sos + weights.game - 100) > 1e-6) return false;
  return weights.win + weights.game > 0;
}

/** Exact triple equality — used to tell "unchanged" from "needs saving". */
export function weightsEqual(a: PowerScoreWeights, b: PowerScoreWeights): boolean {
  return a.win === b.win && a.sos === b.sos && a.game === b.game;
}
