import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';

import TeamGameScoreRow from '../TeamGameScoreRow';

const match = (overrides: Partial<Match> = {}) =>
  ({
    id: 'match-1',
    team1Id: 'team-a',
    team2Id: 'team-b',
    team1Details: { name: 'Rail Riders', image_url: 'https://example.com/rr.png' },
    team2Details: { name: 'Bag Bandits', logo_url: null },
    team1_game_wins: 2,
    team2_game_wins: 1,
    date: '2026-06-10T18:00:00',
    ...overrides,
  }) as unknown as Match;

const renderRow = (props: Partial<React.ComponentProps<typeof TeamGameScoreRow>> = {}) =>
  render(
    <MemoryRouter>
      <TeamGameScoreRow match={match()} teamId="team-a" {...props} />
    </MemoryRouter>
  );

describe('TeamGameScoreRow', () => {
  it('shows the date, both team names and the game score', () => {
    renderRow();

    expect(screen.getByText('Jun 10, 2026')).toBeInTheDocument();
    expect(screen.getByText('Rail Riders')).toBeInTheDocument();
    expect(screen.getByText('Bag Bandits')).toBeInTheDocument();
    expect(screen.getByText('–').parentElement).toHaveTextContent('2 – 1');
  });

  it('links each team name and logo to its team page', () => {
    renderRow();

    const railRidersLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/teams/rail-riders');
    const banditsLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/teams/bag-bandits');

    expect(railRidersLinks).toHaveLength(2);
    expect(banditsLinks).toHaveLength(2);
  });

  it('falls back to the first letter when a team has no logo', () => {
    renderRow();

    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('colours the winner green and the loser red when highlighting is on', () => {
    renderRow({ highlightWinnerLoser: true });

    expect(screen.getByText('Rail Riders').className).toContain('text-green-600');
    expect(screen.getByText('Bag Bandits').className).toContain('text-red-500');
  });

  it('colours the away winner green when the away team takes more games', () => {
    renderRow({
      highlightWinnerLoser: true,
      match: match({ team1_game_wins: 0, team2_game_wins: 2 }),
    });

    expect(screen.getByText('Bag Bandits').className).toContain('text-green-600');
    expect(screen.getByText('Rail Riders').className).toContain('text-red-500');
  });

  it('adds no winner or loser colour when highlighting is off', () => {
    renderRow();

    expect(screen.getByText('Rail Riders').className).not.toContain('text-green-600');
    expect(screen.getByText('Bag Bandits').className).not.toContain('text-red-500');
  });
});
