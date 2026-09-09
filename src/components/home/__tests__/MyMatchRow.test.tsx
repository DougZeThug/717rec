import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { MatchRow } from '@/components/home/MyMatchRow';
import type { Match } from '@/types';

import type { MatchWithOpponent, TeamInfo } from '../myMatchesTypes';

vi.mock('@/hooks/live-scoring/useCanScoreMatch', () => ({
  useCanScoreMatch: () => ({ canScore: false }),
}));

const myTeam: TeamInfo = { id: 'team-1', name: 'Three Amigos', logoUrl: null };
const opponent: TeamInfo = { id: 'team-2', name: 'Baggin Rights', logoUrl: null };

const makeMatchInfo = (overrides: Partial<Match> = {}): MatchWithOpponent => ({
  match: {
    id: 'match-9',
    team1Id: 'team-1',
    team2Id: 'team-2',
    // 7pm on Thu 3 Sep 2026, local.
    date: new Date(2026, 8, 3, 19, 0, 0).toISOString(),
    location: 'Court 1',
    iscompleted: false,
    ...overrides,
  } as Match,
  opponent,
  weekNumber: 4,
});

const renderRow = (matchInfo = makeMatchInfo(), isPrevious = false) =>
  render(
    <MemoryRouter>
      <MatchRow
        matchInfo={matchInfo}
        myTeam={myTeam}
        isPrevious={isPrevious}
        shouldApplyWinter={false}
      />
    </MemoryRouter>
  );

const scheduleLink = () =>
  screen
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
    .find((href) => href?.startsWith('/schedule'));

describe('MyMatchRow link', () => {
  // UX audit SC-04: the row pointed at a bare /schedule, which opens on
  // whichever night the page guesses — never the one a previous match is on.
  it('points at the night the match is on, and the match itself', () => {
    renderRow();

    expect(scheduleLink()).toBe('/schedule?date=2026-09-03#match-match-9');
  });

  it('points at a previous match the same way', () => {
    renderRow(makeMatchInfo({ iscompleted: true }), true);

    expect(scheduleLink()).toBe('/schedule?date=2026-09-03#match-match-9');
  });

  // "Date TBD" matches exist; the row must still go somewhere sensible.
  it('falls back to the whole schedule when the match has no date', () => {
    renderRow(makeMatchInfo({ date: null as unknown as string }));

    expect(scheduleLink()).toBe('/schedule');
  });
});
