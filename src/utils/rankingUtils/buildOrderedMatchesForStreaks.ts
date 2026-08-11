import { Match } from '@/types';

/**
 * The shape this module needs from a completed playoff match. Declared
 * structurally so ranking utilities stay independent of the service layer;
 * `SeasonPlayoffMatch` satisfies it.
 */
export interface PlayoffMatchForOrdering {
  id: string;
  team1Id: string;
  team2Id: string;
  winnerId: string;
  loserId: string | null;
  team1GameWins: number | null;
  team2GameWins: number | null;
  round: number;
  position: number;
  recordedAt: string | null;
}

const timeOf = (value: string | null | undefined): number =>
  value ? new Date(value).getTime() : 0;

/**
 * Merges regular-season and playoff matches into one chronological list, oldest
 * first, and stamps each with an explicit `orderKey`.
 *
 * Playoff matches have no date, so they cannot be interleaved by timestamp alone.
 * They are placed after every regular-season match by construction — the playoffs
 * follow the regular season — and ordered among themselves by when the result was
 * recorded, falling back to bracket round and position whenever the timestamps
 * cannot decide it — including for the whole set as soon as any one row is
 * unstamped. That fallback carries most of the weight: a result cascading through
 * a bracket updates several rows inside one transaction, so their timestamps are
 * identical, and a row nothing has stamped yet has none at all.
 *
 * The returned matches are safe to hand to `calculateStreak`, which prefers
 * `orderKey` over `date`.
 */
export const buildOrderedMatchesForStreaks = (
  regularMatches: Match[],
  playoffMatches: PlayoffMatchForOrdering[]
): Match[] => {
  const regular = [...regularMatches].sort((a, b) => timeOf(a.date) - timeOf(b.date));

  // One ordering policy for the whole set, chosen up front. playoff_matches
  // .created_at and .updated_at are both nullable with no default, and the trigger
  // that creates bracket rows writes neither, so an unstamped row read as the epoch
  // would sort ahead of every dated game regardless of its round. Deciding that
  // per pair instead would make the comparator non-transitive — with a mix of
  // stamped and unstamped rows, A before B and B before C but C before A — and
  // sort() would then return a different order depending on the input order.
  const everyPlayoffStamped = playoffMatches.every((match) => Boolean(match.recordedAt));

  const playoff = [...playoffMatches].sort((a, b) => {
    if (everyPlayoffStamped) {
      const delta = timeOf(a.recordedAt) - timeOf(b.recordedAt);
      if (delta !== 0) return delta;
    }
    return a.round - b.round || a.position - b.position;
  });

  const asMatch = (p: PlayoffMatchForOrdering): Match =>
    ({
      id: p.id,
      team1Id: p.team1Id,
      team2Id: p.team2Id,
      winnerId: p.winnerId,
      loserId: p.loserId ?? undefined,
      iscompleted: true,
      team1_game_wins: p.team1GameWins ?? undefined,
      team2_game_wins: p.team2GameWins ?? undefined,
    }) as Match;

  return [...regular, ...playoff.map(asMatch)].map((match, index) => ({
    ...match,
    orderKey: index,
  }));
};
