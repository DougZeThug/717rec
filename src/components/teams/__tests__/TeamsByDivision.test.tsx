import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TeamsByDivision } from '@/components/teams/TeamsByDivision';
import type { Team } from '@/types';

type SectionProps = {
  divisionName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

vi.mock('@/components/teams/TeamsDivisionSection', () => ({
  TeamsDivisionSection: ({ divisionName, isExpanded, onToggleExpand }: SectionProps) => (
    <button
      type="button"
      data-testid={divisionName}
      data-expanded={isExpanded}
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

const renderByDivision = (teamsByDivision: Record<string, Team[]>) => (
  <TeamsByDivision
    teamsByDivision={teamsByDivision}
    getDivisionName={getDivisionName}
    onEditTeam={vi.fn()}
    onDeleteTeam={vi.fn()}
    isLoading={false}
    viewMode="grid"
    sortMode="rank"
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

  it('opens one division at a time', async () => {
    render(renderByDivision(populated));

    await userEvent.click(screen.getByTestId('Intermediate'));

    expect(screen.getByTestId('Intermediate')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('Competitive')).toHaveAttribute('data-expanded', 'false');
  });
});
