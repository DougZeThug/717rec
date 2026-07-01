import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeamSelector from '@/components/schedule/TeamSelector';
import type { TeamSelectorProps } from '@/components/schedule/types';
import type { Team } from '@/types';

const teams: Team[] = [
  { id: 't1', name: 'Wolves' },
  { id: 't2', name: 'Hawks' },
  { id: 't3', name: 'Falcons' },
];

const renderSelector = (overrides: Partial<TeamSelectorProps> = {}) => {
  const setTeamId = vi.fn();
  render(
    <TeamSelector
      teamId=""
      setTeamId={setTeamId}
      otherTeamId="t2"
      teams={teams}
      label="Home Team"
      placeholder="Select a team"
      {...overrides}
    />
  );
  return { setTeamId };
};

describe('TeamSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label and placeholder for an empty selection', () => {
    renderSelector();

    expect(screen.getByText('Home Team')).toBeInTheDocument();
    expect(screen.getByText('Select a team')).toBeInTheDocument();
  });

  it('filters out the other selected team and calls setTeamId on option selection', () => {
    const { setTeamId } = renderSelector();

    fireEvent.click(screen.getByRole('combobox'));

    // t2 (Hawks) is the otherTeamId and must be excluded from the options.
    expect(screen.queryByRole('option', { name: 'Hawks' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Wolves' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Falcons' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Falcons' }));

    expect(setTeamId).toHaveBeenCalledTimes(1);
    expect(setTeamId).toHaveBeenCalledWith('t3');
  });
});
