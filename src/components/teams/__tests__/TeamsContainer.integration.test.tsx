import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';

const mockUseTeamManagement = vi.hoisted(() => vi.fn());
const mockUseDivisions = vi.hoisted(() => vi.fn());

type TeamListMockProps = { teams: Team[]; isLoading: boolean };
type TeamsByDivisionMockProps = { teamsByDivision: Record<string, Team[]>; isLoading: boolean };

type TeamManagementState = {
  teams: Team[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  teamToEdit: Team | null;
  setTeamToEdit: (team: Team | null) => void;
  deleteTeamId: string | null;
  setDeleteTeamId: (id: string | null) => void;
  isDeleting: boolean;
  handleUpdateTeam: () => Promise<void>;
  handleDeleteTeam: () => void;
};

vi.mock('@/hooks/useTeamManagement', () => ({ useTeamManagement: () => mockUseTeamManagement() }));
vi.mock('@/hooks/useDivisions', () => ({ useDivisions: () => mockUseDivisions() }));
vi.mock('@/utils/teamGrouping', () => ({
  groupTeamsByDisplayDivision: (teams: Team[]) => ({
    Alpha: teams.filter((t) => t.division_id === 'd1'),
  }),
}));
vi.mock('../TeamList', () => ({
  TeamList: ({ teams, isLoading }: TeamListMockProps) => (
    <div>
      {isLoading
        ? 'Loading teams...'
        : teams.length
          ? teams.map((t) => t.name).join(', ')
          : 'No teams yet'}
    </div>
  ),
}));
vi.mock('../TeamsByDivision', () => ({
  TeamsByDivision: ({ teamsByDivision, isLoading }: TeamsByDivisionMockProps) => (
    <div>
      {isLoading
        ? 'Loading grouped teams...'
        : Object.keys(teamsByDivision).length
          ? 'Grouped teams loaded'
          : 'No grouped teams'}
    </div>
  ),
}));

import TeamsContainer from '../TeamsContainer';

const base: TeamManagementState = {
  teams: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  teamToEdit: null,
  setTeamToEdit: vi.fn(),
  deleteTeamId: null,
  setDeleteTeamId: vi.fn(),
  isDeleting: false,
  handleUpdateTeam: vi.fn().mockResolvedValue(undefined),
  handleDeleteTeam: vi.fn(),
};

describe('TeamsContainer integration states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDivisions.mockReturnValue({ divisions: [] });
    mockUseTeamManagement.mockReturnValue({ ...base });
  });

  it('shows loading state', () => {
    mockUseTeamManagement.mockReturnValue({ ...base, isLoading: true });
    render(<TeamsContainer displayMode="all" viewMode="grid" sortMode="rank" />);
    expect(screen.getByText(/loading teams/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<TeamsContainer displayMode="all" viewMode="grid" sortMode="rank" />);
    expect(screen.getByText('No teams yet')).toBeInTheDocument();
  });

  it('shows populated teams and sorting alpha', () => {
    const teams = [
      { id: '2', name: 'Zeta', wins: 0, losses: 0, players: [] },
      { id: '1', name: 'Alpha', wins: 0, losses: 0, players: [] },
    ] as Team[];
    mockUseTeamManagement.mockReturnValue({ ...base, teams });

    render(<TeamsContainer displayMode="all" viewMode="grid" sortMode="alpha" />);
    expect(screen.getByText('Alpha, Zeta')).toBeInTheDocument();
  });

  it('opens delete dialog and confirms action', async () => {
    const handleDeleteTeam = vi.fn();
    mockUseTeamManagement.mockReturnValue({ ...base, deleteTeamId: 't1', handleDeleteTeam });
    render(<TeamsContainer displayMode="all" viewMode="grid" sortMode="rank" />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(handleDeleteTeam).toHaveBeenCalled();
  });

  it('shows a retryable error state in grouped mode when the fetch fails', async () => {
    const refetch = vi.fn();
    mockUseTeamManagement.mockReturnValue({ ...base, error: new Error('boom'), refetch });
    render(<TeamsContainer displayMode="grouped" viewMode="grid" sortMode="rank" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/couldn't load the teams/i)).toBeInTheDocument();
    // Grouped view must not fall through to the "no teams" division message.
    expect(screen.queryByText('Grouped teams loaded')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
