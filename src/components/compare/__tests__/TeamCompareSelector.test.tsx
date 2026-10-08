import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import { TeamCompareSelector } from '../TeamCompareSelector';

const teams: Team[] = [
  { id: 't1', name: 'Alpha Bags' },
  { id: 't2', name: 'Bravo Throwers' },
  { id: 't3', name: 'Charlie Corn' },
];

describe('TeamCompareSelector', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('shows both picked teams and keeps the swap button enabled', () => {
    const onSwap = vi.fn();
    render(
      <TeamCompareSelector
        teams={teams}
        team1={teams[0]}
        team2={teams[1]}
        onTeam1Change={vi.fn()}
        onTeam2Change={vi.fn()}
        onSwap={onSwap}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Team 1' })).toHaveTextContent('Alpha Bags');
    expect(screen.getByRole('combobox', { name: 'Team 2' })).toHaveTextContent('Bravo Throwers');

    fireEvent.click(screen.getByRole('button', { name: 'Swap teams' }));
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it('shows placeholders and disables swap when nothing is picked', () => {
    render(
      <TeamCompareSelector
        teams={teams}
        team1={null}
        team2={null}
        onTeam1Change={vi.fn()}
        onTeam2Change={vi.fn()}
        onSwap={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Team 1' })).toHaveTextContent('Select Team 1');
    expect(screen.getByRole('combobox', { name: 'Team 2' })).toHaveTextContent('Select Team 2');
    expect(screen.getByRole('button', { name: 'Swap teams' })).toBeDisabled();
  });

  it('leaves the other side team out of each list and reports the pick', () => {
    const onTeam1Change = vi.fn();
    const onTeam2Change = vi.fn();
    render(
      <TeamCompareSelector
        teams={teams}
        team1={teams[0]}
        team2={teams[1]}
        onTeam1Change={onTeam1Change}
        onTeam2Change={onTeam2Change}
        onSwap={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('combobox', { name: 'Team 1' }));
    expect(screen.queryByRole('option', { name: /Bravo Throwers/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Charlie Corn/ }));
    expect(onTeam1Change).toHaveBeenCalledWith(teams[2]);

    fireEvent.click(screen.getByRole('combobox', { name: 'Team 2' }));
    expect(screen.queryByRole('option', { name: /Alpha Bags/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Charlie Corn/ }));
    expect(onTeam2Change).toHaveBeenCalledWith(teams[2]);
  });
});
