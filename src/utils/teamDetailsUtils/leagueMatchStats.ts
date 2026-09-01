import { Match } from '@/types';
import { calculateClutchRecord } from '@/utils/teamDetailsUtils/matchOutcomeUtils';
import { calculateSweepRate } from '@/utils/teamDetailsUtils/sweepRateUtils';

export interface LeagueTeamMatchStats {
  /** Sweeps as a percentage of all matches played, 0-100. */
  sweepRate: number;
  /** Win rate in matches that went to a deciding third game, 0-100. */
  clutchWinPct: number;
  /** How many matches went to a third game. Zero means there is no clutch rate to report. */
  game3Matches: number;
}

/**
 * Group a league-wide match list by team.
 *
 * The report card needs a sweep rate and a clutch record for *every* team, not
 * just the one on screen, because the grades are percentiles against the rest
 * of the league. Walking the whole match list once per team would be O(teams ×
 * matches); this walks it once.
 */
const groupMatchesByTeam = (matches: Match[] | undefined): Map<string, Match[]> => {
  const byTeam = new Map<string, Match[]>();
  if (!matches) return byTeam;

  for (const match of matches) {
    for (const teamId of [match.team1Id, match.team2Id]) {
      if (!teamId) continue;
      const existing = byTeam.get(teamId);
      if (existing) {
        existing.push(match);
      } else {
        byTeam.set(teamId, [match]);
      }
    }
  }

  return byTeam;
};

/**
 * Real sweep rate and clutch record for every team in a match list.
 *
 * These used to be faked on the report card: the sweep rate of every team but
 * the one on screen was estimated from its game win percentage, and the
 * leaderboard gave every team a neutral clutch grade. Both figures are
 * computable from the match list the rankings query already fetches — see B-36
 * in `docs/product-description/bug-triage.md`.
 */
export const calculateLeagueMatchStats = (
  matches: Match[] | undefined
): Map<string, LeagueTeamMatchStats> => {
  const stats = new Map<string, LeagueTeamMatchStats>();

  for (const [teamId, teamMatches] of groupMatchesByTeam(matches)) {
    const clutch = calculateClutchRecord(teamId, teamMatches);
    stats.set(teamId, {
      sweepRate: calculateSweepRate(teamId, teamMatches).sweepRate,
      clutchWinPct: clutch.clutchWinPct,
      game3Matches: clutch.game3Matches,
    });
  }

  return stats;
};

/** A team with no match at all still needs an entry, so callers get zeroes rather than undefined. */
export const EMPTY_LEAGUE_MATCH_STATS: LeagueTeamMatchStats = {
  sweepRate: 0,
  clutchWinPct: 0,
  game3Matches: 0,
};
