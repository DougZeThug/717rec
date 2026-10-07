import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

vi.mock('@/components/badges/TeamBadgeCollection', () => ({
  default: ({ teamId }: { teamId: string }) => <div data-testid="badges">{`badges-${teamId}`}</div>,
}));

vi.mock('../TeamStats', () => ({
  TeamStats: ({ team }: { team: Team }) => <div data-testid="stats">{`stats-${team.id}`}</div>,
}));

import TeamCard from '../TeamCard';

const team = { id: 't1', name: 'Degeneration X', imageUrl: '/logo.png' } as Team;

const renderCard = (isWinter?: boolean) =>
  render(
    <MemoryRouter>
      <TeamCard team={team} isWinter={isWinter} />
    </MemoryRouter>
  );

describe('TeamCard', () => {
  it('links to the team page and shows the logo, name, badges and stats', () => {
    renderCard();

    expect(screen.getByRole('link')).toHaveAttribute('href', '/teams/t1');
    expect(screen.getByAltText('Degeneration X')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Degeneration X' })).toBeInTheDocument();
    expect(screen.getByTestId('badges')).toHaveTextContent('badges-t1');
    expect(screen.getByTestId('stats')).toHaveTextContent('stats-t1');
  });

  it('uses the frosted image area in the winter theme', () => {
    const { container } = renderCard(true);

    expect(container.querySelector('.h-44')?.className).toContain('from-slate-800/80');
  });
});
