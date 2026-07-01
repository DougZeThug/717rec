import React from 'react';

import BracketView from '@/components/playoffs/BracketView';
import { Button } from '@/components/ui/button';
import type { PlayoffBracket, PlayoffMatch, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

const BRACKET_ID = 'e2e-playoff-bracket-proof';

const SF1_ID = 'e2e-match-sf1';
const SF2_ID = 'e2e-match-sf2';
const FINAL_ID = 'e2e-match-final';

const teams: PlayoffTeam[] = [
  { id: 'e2e-team-alpha', name: 'E2E Alpha', seed: 1 },
  { id: 'e2e-team-beta', name: 'E2E Beta', seed: 2 },
  { id: 'e2e-team-gamma', name: 'E2E Gamma', seed: 3 },
  { id: 'e2e-team-delta', name: 'E2E Delta', seed: 4 },
];

/**
 * A four-team, two-round single-elimination bracket. The final starts empty so
 * the e2e can prove that semifinal winners visibly *advance* into it (rather
 * than a single match that only crowns a champion).
 */
const createSeededBracket = (): PlayoffBracket => ({
  id: BRACKET_ID,
  name: 'E2E Two-Round Playoff Bracket',
  division: 'Recreational',
  divisionId: 'e2e-division-recreational',
  format: 'Single Elimination',
  state: 'pending',
  uses_brackets_manager: false,
  matches: [
    {
      id: SF1_ID,
      bracket_id: BRACKET_ID,
      round: 1,
      position: 1,
      team1Id: 'e2e-team-alpha',
      team2Id: 'e2e-team-delta',
      team1Seed: 1,
      team2Seed: 4,
      team1Score: null,
      team2Score: null,
      winnerId: null,
      loserId: null,
      matchType: 'winners',
      bestOf: 1,
      status: 'pending',
      nextWinMatchId: FINAL_ID,
    },
    {
      id: SF2_ID,
      bracket_id: BRACKET_ID,
      round: 1,
      position: 2,
      team1Id: 'e2e-team-beta',
      team2Id: 'e2e-team-gamma',
      team1Seed: 2,
      team2Seed: 3,
      team1Score: null,
      team2Score: null,
      winnerId: null,
      loserId: null,
      matchType: 'winners',
      bestOf: 1,
      status: 'pending',
      nextWinMatchId: FINAL_ID,
    },
    {
      id: FINAL_ID,
      bracket_id: BRACKET_ID,
      round: 2,
      position: 1,
      team1Id: null,
      team2Id: null,
      team1Seed: null,
      team2Seed: null,
      team1Score: null,
      team2Score: null,
      winnerId: null,
      loserId: null,
      matchType: 'finals',
      bestOf: 1,
      status: 'pending',
    },
  ],
});

const getTeamName = (teamId: string | null | undefined) =>
  teams.find((team) => team.id === teamId)?.name ?? 'TBD';

/**
 * Apply a completed result to `matchId`, then advance the winner into the open
 * slot of its next match. Semifinal 1 (position 1) fills the final's first
 * slot; semifinal 2 (position 2) fills the second — the visible "advancement".
 */
const applyResult = (
  bracket: PlayoffBracket,
  matchId: string,
  winnerId: string,
  team1Score: number,
  team2Score: number
): PlayoffBracket => {
  const source = bracket.matches?.find((m) => m.id === matchId);
  if (!source) return bracket;

  const loserId = source.team1Id === winnerId ? source.team2Id : source.team1Id;

  const matches: PlayoffMatch[] = (bracket.matches ?? []).map((match) => {
    if (match.id === matchId) {
      return { ...match, team1Score, team2Score, winnerId, loserId, status: 'completed' };
    }
    // Advance the winner into the next round's open slot.
    if (source.nextWinMatchId && match.id === source.nextWinMatchId) {
      return source.position === 1
        ? { ...match, team1Id: winnerId, team1Seed: source.team1Seed }
        : { ...match, team2Id: winnerId, team2Seed: source.team2Seed };
    }
    return match;
  });

  const isFinal = !source.nextWinMatchId;
  return {
    ...bracket,
    matches,
    ...(isFinal ? { state: 'completed', champion: winnerId } : {}),
  };
};

const PlayoffBracketE2EProof = () => {
  const [bracket, setBracket] = React.useState<PlayoffBracket | null>(null);

  const matchById = (id: string) => bracket?.matches?.find((match) => match.id === id);
  const semifinal1 = matchById(SF1_ID);
  const semifinal2 = matchById(SF2_ID);
  const final = matchById(FINAL_ID);

  const semifinalsCompleted = [semifinal1, semifinal2].filter(
    (match) => match?.status === 'completed'
  ).length;
  const finalReady = semifinalsCompleted === 2 && final?.status !== 'completed';

  const submit = (matchId: string, winnerId: string, team1Score: number, team2Score: number) =>
    setBracket((current) =>
      current ? applyResult(current, matchId, winnerId, team1Score, team2Score) : current
    );

  return (
    <div className="min-h-screen p-8 space-y-6" data-testid="playoff-bracket-e2e-proof">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Playoff Bracket E2E Proof</h1>
        <p className="text-muted-foreground">
          Browser-only proof that semifinal winners visibly advance into the final of a seeded
          playoff bracket before a champion is crowned.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setBracket(createSeededBracket())}>Create 4-team bracket</Button>
        <Button
          onClick={() => submit(SF1_ID, 'e2e-team-alpha', 21, 15)}
          disabled={!bracket || semifinal1?.status === 'completed'}
        >
          Submit SF1: Alpha over Delta
        </Button>
        <Button
          onClick={() => submit(SF2_ID, 'e2e-team-beta', 21, 17)}
          disabled={!bracket || semifinal2?.status === 'completed'}
        >
          Submit SF2: Beta over Gamma
        </Button>
        <Button onClick={() => submit(FINAL_ID, 'e2e-team-alpha', 21, 18)} disabled={!finalReady}>
          Submit Final: Alpha over Beta
        </Button>
      </div>

      <section aria-label="Bracket proof status" className="rounded-lg border p-4 space-y-2">
        <p data-testid="bracket-created-state">
          Creation: {bracket ? 'Bracket created successfully' : 'No bracket created'}
        </p>
        <p data-testid="bracket-semifinal-state">Semifinals: {semifinalsCompleted}/2 completed</p>
        <p data-testid="bracket-final-slot1">Final team 1: {getTeamName(final?.team1Id)}</p>
        <p data-testid="bracket-final-slot2">Final team 2: {getTeamName(final?.team2Id)}</p>
        <p data-testid="bracket-final-state">Final status: {final?.status ?? 'not created'}</p>
        <p data-testid="bracket-visible-champion">
          Champion: {bracket?.champion ? getTeamName(bracket.champion) : 'TBD'}
        </p>
      </section>

      {bracket ? (
        <BracketView bracketId={bracket.id} bracket={bracket} teams={teams} />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Create the bracket to render the playoff viewer.
        </div>
      )}
    </div>
  );
};

export default PlayoffBracketE2EProof;
