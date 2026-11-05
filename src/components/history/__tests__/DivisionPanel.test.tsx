import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DivisionPanel from '../DivisionPanel';

const state = vi.hoisted(() => ({ isMobile: false, isWinterTheme: false }));
// Counts every time the (mocked) standings table is drawn, so a test can tell
// "never drawn" apart from "drawn, then removed again".
const tableSpy = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => state.isMobile }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: state.isWinterTheme }),
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  m: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));
vi.mock('../HistoricalStandingsTable', () => ({
  default: ({ teams }: { teams: { team_name: string }[] }) => {
    tableSpy(teams);
    return (
      <ol data-testid="table">
        {teams.map((t) => (
          <li key={t.team_name}>{t.team_name}</li>
        ))}
      </ol>
    );
  },
}));

const makeTeam = (name: string, wins: number, playoffRank: number | null) => ({
  team_id: name,
  season_id: 's1',
  match_wins: wins,
  match_losses: 0,
  game_wins: 0,
  game_losses: 0,
  sos: null,
  power_score: null,
  champion: false,
  runner_up: false,
  division_name: 'Gold',
  team_name: name,
  team_logo_url: null,
  team_image_url: null,
  playoff_rank: playoffRank,
});

describe('DivisionPanel', () => {
  beforeEach(() => {
    state.isMobile = false;
    state.isWinterTheme = false;
  });

  it('shows the division name with its team count and ranks teams by playoff finish, then wins', () => {
    render(
      <DivisionPanel
        divisionName="Gold"
        teams={[
          makeTeam('No Playoff Few Wins', 1, null),
          makeTeam('Second', 5, 2),
          makeTeam('No Playoff Many Wins', 9, null),
          makeTeam('First', 3, 1),
        ]}
      />
    );

    expect(screen.getByRole('heading', { level: 4, name: /Gold/ })).toHaveTextContent('Gold(4)');
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'First',
      'Second',
      'No Playoff Many Wins',
      'No Playoff Few Wins',
    ]);
  });

  it('collapses and expands the table when the header is clicked', () => {
    render(<DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.getByTestId('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('starts collapsed on a phone and uses the winter text colours in the winter theme', () => {
    state.isMobile = true;
    state.isWinterTheme = true;
    render(<DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4 })).toHaveClass('text-white');
  });

  it('never draws the team list on a phone, not even for one frame', () => {
    state.isMobile = true;
    render(<DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    // The old code started open and closed itself in an effect, so the table
    // was drawn once (a giant list that then collapsed). It must never be drawn.
    expect(tableSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('draws the team list once on a wide screen', () => {
    render(<DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(tableSpy).toHaveBeenCalled();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('closes an open division when the screen shrinks to a phone', () => {
    const { rerender } = render(
      <DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />
    );
    expect(screen.getByTestId('table')).toBeInTheDocument();

    state.isMobile = true;
    rerender(<DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });

  it('gives the chevron button a fixed name and an aria-expanded that follows open and closed', () => {
    render(<DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    const toggle = screen.getByRole('button', { name: 'Toggle Gold teams' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // A click on the button reaches the row, so the row's handler flips the state.
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName('Toggle Gold teams');
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('heading', { level: 4 }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Toggle Gold teams');
  });

  it('reports the chevron button as closed on a phone', () => {
    state.isMobile = true;
    render(<DivisionPanel divisionName="Gold" teams={[makeTeam('First', 3, 1)]} />);

    expect(screen.getByRole('button', { name: 'Toggle Gold teams' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
