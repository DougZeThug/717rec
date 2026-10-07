import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

const { mockAdminAccess, mockTheme } = vi.hoisted(() => ({
  mockAdminAccess: vi.fn(),
  mockTheme: vi.fn(),
}));

vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockAdminAccess() }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => mockTheme(),
  useSeasonalThemeBase: () => mockTheme(),
}));
vi.mock('../../shared/TeamImage', () => ({
  TeamImage: ({ teamName }: { teamName: string }) => <span>{`logo of ${teamName}`}</span>,
}));

import { TeamCardList } from '../TeamCardList';

const team: Team = {
  id: 'team-1',
  name: 'Corn Stars',
  wins: 4,
  losses: 2,
  game_wins: 9,
  game_losses: 5,
  power_score: 1.25,
  sos: 0.55,
  divisionName: 'Competitive',
  players: ['Ann', 'Bob'],
};

const renderCard = (props: Partial<React.ComponentProps<typeof TeamCardList>> = {}) =>
  render(
    <MemoryRouter>
      <TeamCardList team={team} {...props} />
    </MemoryRouter>
  );

describe('TeamCardList', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    mockAdminAccess.mockReturnValue({ isAdminAccessGranted: false });
    mockTheme.mockReturnValue({ isWinterTheme: false });
  });

  it('shows the team name as a link with its record, games and players', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Corn Stars' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Corn Stars/ })[0]).toHaveAttribute(
      'href',
      '/teams/corn-stars'
    );
    expect(screen.getByText('9 - 5')).toBeInTheDocument();
    expect(screen.getByText('0.550')).toBeInTheDocument();
    expect(screen.getByText('Ann')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('gives a visitor only View Details in the menu', async () => {
    renderCard({ onEdit: vi.fn(), onDelete: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(await screen.findByRole('menuitem', { name: 'View Details' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('lets an admin edit the team from the menu', async () => {
    mockAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    const onEdit = vi.fn();
    renderCard({ onEdit, onDelete: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledWith(team);
  });

  it('lets an admin delete the team from the menu', async () => {
    mockAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    const onDelete = vi.fn();
    renderCard({ onEdit: vi.fn(), onDelete });

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith('team-1');
  });

  it('renders the winter card for the winter theme', () => {
    mockTheme.mockReturnValue({ isWinterTheme: true });
    const { container } = renderCard();

    expect(container.querySelector('.winter-card-surface')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Corn Stars' })).toBeInTheDocument();
  });
});
