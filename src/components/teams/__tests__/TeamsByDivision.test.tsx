import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TeamsByDivision } from '@/components/teams/TeamsByDivision';
import type { Team } from '@/types';

type SectionProps = {
  divisionName: string;
  teams: Team[];
  isExpanded: boolean;
  scrollIntoViewOnExpand: boolean;
  onToggleExpand: () => void;
};

vi.mock('@/components/teams/TeamsDivisionSection', () => ({
  TeamsDivisionSection: ({
    divisionName,
    teams,
    isExpanded,
    scrollIntoViewOnExpand,
    onToggleExpand,
  }: SectionProps) => (
    <button
      type="button"
      data-testid={divisionName}
      data-expanded={isExpanded}
      data-scroll={scrollIntoViewOnExpand}
      data-teams={teams.map((t) => t.name).join(',')}
      onClick={onToggleExpand}
    >
      {divisionName}
    </button>
  ),
}));

const team = (id: string): Team => ({ id, name: id, power_score: 1 }) as unknown as Team;

const populated: Record<string, Team[]> = {
  Competitive: [team('a'), team('b')],
  Intermediate: [team('c')],
};

const getDivisionName = (displayDivision: string | undefined) => `${displayDivision}`;

const renderByDivision = (
  teamsByDivision: Record<string, Team[]>,
  sortMode: 'rank' | 'alpha' = 'rank'
) => (
  <TeamsByDivision
    teamsByDivision={teamsByDivision}
    getDivisionName={getDivisionName}
    onEditTeam={vi.fn()}
    onDeleteTeam={vi.fn()}
    isLoading={false}
    viewMode="grid"
    sortMode={sortMode}
  />
);

describe('TeamsByDivision', () => {
  it('opens the first division once the teams arrive', () => {
    // The teams are still loading on first mount, which is exactly the case
    // that used to leave every division closed and the page showing no teams.
    const { rerender } = render(renderByDivision({}));

    expect(screen.getByText('No teams available in any division.')).toBeInTheDocument();

    rerender(renderByDivision(populated));

    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('Intermediate')).toHaveAttribute('data-expanded', 'false');
  });

  it('skips a division that has no teams when picking the default', () => {
    render(renderByDivision({ Recreational: [], Competitive: [team('a')] }));

    expect(screen.queryByTestId('Recreational')).not.toBeInTheDocument();
    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-expanded', 'true');
  });

  it('keeps a division the visitor closed shut', async () => {
    const { rerender } = render(renderByDivision(populated));

    await userEvent.click(screen.getByTestId('Competitive'));
    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-expanded', 'false');

    rerender(renderByDivision(populated));

    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-expanded', 'false');
  });

  it('does not ask the default division to scroll itself into view', async () => {
    // Scrolling on arrival would move the page under a visitor who did nothing,
    // and would override the scroll position the Teams page restores.
    const { rerender } = render(renderByDivision({}));
    rerender(renderByDivision(populated));

    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-scroll', 'false');

    await userEvent.click(screen.getByTestId('Intermediate'));

    expect(screen.getByTestId('Intermediate')).toHaveAttribute('data-scroll', 'true');
  });

  it('sorts a division by name when the visitor asks for A-Z', () => {
    const named = (id: string, name: string, power: number) =>
      ({ id, name, power_score: power }) as unknown as Team;
    const teams = {
      Competitive: [named('c', 'Cobras', 90), named('a', 'Aces', 10), named('b', 'Bandits', 50)],
    };

    render(renderByDivision(teams, 'alpha'));

    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-teams', 'Aces,Bandits,Cobras');
  });

  it('sorts a division by power score by default', () => {
    const named = (id: string, name: string, power: number) =>
      ({ id, name, power_score: power }) as unknown as Team;
    const teams = {
      Competitive: [named('a', 'Aces', 10), named('c', 'Cobras', 90), named('b', 'Bandits', 50)],
    };

    render(renderByDivision(teams));

    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-teams', 'Cobras,Bandits,Aces');
  });

  it('opens one division at a time', async () => {
    render(renderByDivision(populated));

    await userEvent.click(screen.getByTestId('Intermediate'));

    expect(screen.getByTestId('Intermediate')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-expanded', 'false');
  });
});
