/** What the admin picked for one side of a winners-bracket round 1 match. */
export type TeamChoice = { kind: 'team'; teamId: string } | { kind: 'bye' };

export interface EditMatchTeamsParams {
  matchId: number;
  opponent1: TeamChoice;
  opponent2: TeamChoice;
  /**
   * The participant ids the screen was opened with (null for a BYE or empty
   * spot). The save is refused when the match no longer holds them, so an
   * edit made on a stale screen never overwrites a newer change.
   */
  expectedOpponent1Id: number | null;
  expectedOpponent2Id: number | null;
  /**
   * For each picked team (by team id): the winners round 1 match it sat in
   * when the screen was opened, or null if none. A trade is refused when a
   * picked team has moved since, so it never trades with the wrong match.
   */
  expectedPickLocations?: Record<string, number | null>;
}

/**
 * Who sits in a slot, as Edit teams plans it: a team (its participant id;
 * negative while a team new to the bracket has no participant row yet), a
 * stored BYE, or an empty spot still waiting for a team.
 */
export type Occupant =
  { kind: 'team'; participantId: number; name: string } | { kind: 'bye' } | { kind: 'tbd' };
