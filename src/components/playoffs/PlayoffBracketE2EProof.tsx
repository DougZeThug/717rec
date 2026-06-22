import React from 'react';

import BracketView from '@/components/playoffs/BracketView';
import { Button } from '@/components/ui/button';
import type { PlayoffBracket, PlayoffMatch, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

const BRACKET_ID = 'e2e-playoff-bracket-proof';

const teams: PlayoffTeam[] = [
  { id: 'e2e-team-alpha', name: 'E2E Alpha', seed: 1 },
  { id: 'e2e-team-beta', name: 'E2E Beta', seed: 2 },
];

const createSeededBracket = (): PlayoffBracket => ({
  id: BRACKET_ID,
  name: 'E2E Minimal Playoff Bracket',
  division: 'Recreational',
  divisionId: 'e2e-division-recreational',
  format: 'Single Elimination',
  state: 'pending',
  uses_brackets_manager: false,
  matches: [
    {
      id: 'e2e-match-final',
      bracket_id: BRACKET_ID,
      round: 1,
      position: 1,
      team1Id: 'e2e-team-alpha',
      team2Id: 'e2e-team-beta',
      team1Seed: 1,
      team2Seed: 2,
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

const PlayoffBracketE2EProof = () => {
  const [bracket, setBracket] = React.useState<PlayoffBracket | null>(null);

  const match = bracket?.matches?.[0];
  const winnerName = getTeamName(match?.winnerId);

  const advanceMatch = () => {
    setBracket((current) => {
      if (!current) return current;

      const updatedMatches: PlayoffMatch[] = (current.matches ?? []).map((currentMatch) =>
        currentMatch.id === 'e2e-match-final'
          ? {
              ...currentMatch,
              team1Score: 21,
              team2Score: 17,
              winnerId: 'e2e-team-alpha',
              loserId: 'e2e-team-beta',
              status: 'completed',
            }
          : currentMatch
      );

      return {
        ...current,
        state: 'completed',
        champion: 'e2e-team-alpha',
        matches: updatedMatches,
      };
    });
  };

  return (
    <div className="min-h-screen p-8 space-y-6" data-testid="playoff-bracket-e2e-proof">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Playoff Bracket E2E Proof</h1>
        <p className="text-muted-foreground">
          Browser-only proof that a seeded playoff bracket can be created and visibly updates after
          a match is advanced.
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => setBracket(createSeededBracket())}>Create minimal bracket</Button>
        <Button onClick={advanceMatch} disabled={!bracket || bracket.state === 'completed'}>
          Submit E2E Alpha 21-17
        </Button>
      </div>

      <section aria-label="Bracket proof status" className="rounded-lg border p-4 space-y-2">
        <p data-testid="bracket-created-state">
          Creation: {bracket ? 'Bracket created successfully' : 'No bracket created'}
        </p>
        <p data-testid="bracket-match-state">Match status: {match?.status ?? 'not created'}</p>
        <p data-testid="bracket-visible-score">
          Visible score: {match?.team1Score ?? '-'}-{match?.team2Score ?? '-'}
        </p>
        <p data-testid="bracket-visible-winner">Winner: {match?.winnerId ? winnerName : 'TBD'}</p>
        <p data-testid="bracket-visible-champion">
          Champion: {bracket?.champion ? getTeamName(bracket.champion) : 'TBD'}
        </p>
      </section>

      {bracket ? (
        <BracketView bracketId={bracket.id} bracket={bracket} teams={teams} />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Create the minimal bracket to render the playoff viewer.
        </div>
      )}
    </div>
  );
};

export default PlayoffBracketE2EProof;
