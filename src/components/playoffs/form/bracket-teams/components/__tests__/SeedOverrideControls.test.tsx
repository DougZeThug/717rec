import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProcessedTeam, SeedValidationState } from '../../types';

const { mockBulkUpdate, mockReset } = vi.hoisted(() => ({
  mockBulkUpdate: vi.fn(),
  mockReset: vi.fn(),
}));

vi.mock('../../hooks/useTeamSeedMutation', () => ({
  useTeamSeedMutation: () => ({
    bulkUpdateSeeds: { mutateAsync: mockBulkUpdate },
    resetDivisionSeeds: { mutateAsync: mockReset },
    isUpdating: false,
  }),
}));
vi.mock('../SeedOrderList', () => ({
  SeedOrderList: ({
    teams,
    onSeedChange,
  }: {
    teams: ProcessedTeam[];
    onSeedChange: (teamId: string, seed: number | null) => void;
  }) => (
    <div>
      {teams.map((t) => (
        <span key={t.id}>{`${t.seed}. ${t.name}`}</span>
      ))}
      <button onClick={() => onSeedChange('t1', 2)}>Change seed</button>
    </div>
  ),
}));

import { SeedOverrideControls } from '../SeedOverrideControls';

const makeTeam = (id: string, name: string, seed: number): ProcessedTeam => ({
  id,
  name,
  seed,
  powerScore: 1,
  wins: 1,
  losses: 0,
  division_id: 'div-1',
  players: [],
  created_at: '2026-01-01',
  game_wins: 2,
  game_losses: 0,
  sos: 0.5,
  power_score: 1,
  win_percentage: 1,
  game_win_percentage: 1,
  close_match_losses: 0,
});

const teams = [makeTeam('t1', 'Corn Stars', 1), makeTeam('t2', 'Bag Raiders', 2)];

const cleanValidation: SeedValidationState = {
  isLoading: false,
  conflicts: [],
  hasConflicts: false,
  errorMessage: null,
};

const conflictValidation: SeedValidationState = {
  isLoading: false,
  hasConflicts: true,
  errorMessage: 'Two teams share seed 1',
  conflicts: [
    { team_id: 't1', team_name: 'Corn Stars', seed: 1, conflict_count: 2 },
    { team_id: 't2', team_name: 'Bag Raiders', seed: 1, conflict_count: 2 },
  ],
};

describe('SeedOverrideControls', () => {
  beforeEach(() => {
    mockBulkUpdate.mockResolvedValue(undefined);
    mockReset.mockResolvedValue(undefined);
  });

  it('asks for a division before showing seeds', () => {
    render(
      <SeedOverrideControls teams={[]} divisionId="" validation={cleanValidation} show={false} />
    );

    expect(screen.getByText('Select a division to manage seeds')).toBeInTheDocument();
  });

  it('starts in automatic mode and switches to manual seeding', async () => {
    render(<SeedOverrideControls teams={teams} divisionId="div-1" validation={cleanValidation} />);

    expect(screen.getByText(/Seeds are automatically assigned/)).toBeInTheDocument();
    expect(screen.queryByText(/conflicts/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: 'Manual seeding' }));

    expect(screen.getByText(/Drag to reorder teams/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset to Auto' })).toBeInTheDocument();
  });

  it('shows the conflict count and the error message', () => {
    render(
      <SeedOverrideControls teams={teams} divisionId="div-1" validation={conflictValidation} />
    );

    expect(screen.getByText('2 conflicts')).toBeInTheDocument();
    expect(screen.getByText('Two teams share seed 1')).toBeInTheDocument();
  });

  it('saves a changed seed for the division', async () => {
    render(<SeedOverrideControls teams={teams} divisionId="div-1" validation={cleanValidation} />);

    await userEvent.click(screen.getByRole('switch', { name: 'Manual seeding' }));
    await userEvent.click(screen.getByRole('button', { name: 'Change seed' }));
    await userEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() =>
      expect(mockBulkUpdate).toHaveBeenCalledWith({
        updates: [{ teamId: 't1', seed: 2 }],
        divisionId: 'div-1',
      })
    );
  });

  it('resets the division back to automatic seeds', async () => {
    render(<SeedOverrideControls teams={teams} divisionId="div-1" validation={cleanValidation} />);

    await userEvent.click(screen.getByRole('switch', { name: 'Manual seeding' }));
    await userEvent.click(screen.getByRole('button', { name: /Reset to Auto/ }));

    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('div-1'));
  });
});
