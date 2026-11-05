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
    const { container } = renderRow();

    const links = [...container.querySelectorAll('a')];
    const railRidersLinks = links.filter(
      (link) => link.getAttribute('href') === '/teams/rail-riders'
    );
    const banditsLinks = links.filter((link) => link.getAttribute('href') === '/teams/bag-bandits');

    expect(railRidersLinks).toHaveLength(2);
    expect(banditsLinks).toHaveLength(2);
  });

  it('keeps the logo links out of the tab order and the screen reader list', () => {
    const { container } = renderRow();

    const links = [...container.querySelectorAll('a')];
    const logoLinks = links.filter((link) => link.querySelector('span[title]') === null);
    const nameLinks = links.filter((link) => link.querySelector('span[title]') !== null);

    expect(logoLinks).toHaveLength(2);
    for (const link of logoLinks) {
      expect(link).toHaveAttribute('aria-hidden', 'true');
      expect(link).toHaveAttribute('tabindex', '-1');
    }
    // The name links stay: one tab stop per team.
    expect(nameLinks).toHaveLength(2);
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/teams/rail-riders',
      '/teams/bag-bandits',
    ]);
  });

  it('lets a long name wrap onto two lines instead of cutting it with an ellipsis', () => {
    renderRow({
      match: match({
        team1Details: {
          team_id: 'team-a',
          name: 'Rail Riders With A Very Long Name',
          image_url: null,
          logo_url: null,
          divisionName: null,
          division_id: null,
          power_score: null,
          sos: null,
        },
      }),
    });

    const name = screen.getByText('Rail Riders With A Very Long Name');
    expect(name.className).toContain('line-clamp-2');
    expect(name.className).toContain('break-words');
    expect(name.className).not.toContain('truncate');
  });

  it('falls back to the first letter when a team has no logo', () => {
    renderRow();

    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('colours the winner green and the loser red when highlighting is on', () => {
    renderRow({ highlightWinnerLoser: true });

    expect(screen.getByText('Rail Riders').className).toContain('text-green-700');
    expect(screen.getByText('Bag Bandits').className).toContain('text-red-700');
  });

  it('colours the away winner green when the away team takes more games', () => {
    renderRow({
      highlightWinnerLoser: true,
      match: match({ team1_game_wins: 0, team2_game_wins: 2 }),
    });

    expect(screen.getByText('Bag Bandits').className).toContain('text-green-700');
    expect(screen.getByText('Rail Riders').className).toContain('text-red-700');
  });

  it('adds no winner or loser colour when highlighting is off', () => {
    renderRow();

    expect(screen.getByText('Rail Riders').className).not.toContain('text-green-');
    expect(screen.getByText('Bag Bandits').className).not.toContain('text-red-');
  });
});
