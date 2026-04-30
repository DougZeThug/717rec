import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTeamManagement = vi.hoisted(() => vi.fn());
const mockUseDivisions = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useTeamManagement', () => ({ useTeamManagement: () => mockUseTeamManagement() }));
vi.mock('@/hooks/useDivisions', () => ({ useDivisions: () => mockUseDivisions() }));
vi.mock('@/utils/teamGrouping', () => ({
  groupTeamsByDisplayDivision: (teams: any[]) => ({ Alpha: teams.filter((t) => t.division_id === 'd1') }),
}));
vi.mock('../TeamList', () => ({ TeamList: ({ teams, isLoading }: any) => <div>{isLoading ? 'Loading teams...' : teams.length ? teams.map((t: any) => t.name).join(', ') : 'No teams yet'}</div> }));
vi.mock('../TeamsByDivision', () => ({ TeamsByDivision: ({ teamsByDivision, isLoading }: any) => <div>{isLoading ? 'Loading grouped teams...' : Object.keys(teamsByDivision).length ? 'Grouped teams loaded' : 'No grouped teams'}</div> }));

import TeamsContainer from '../TeamsContainer';

const base = {
  teams: [], isLoading: false, teamToEdit: null, setTeamToEdit: vi.fn(), deleteTeamId: null, setDeleteTeamId: vi.fn(), isDeleting: false,
  handleUpdateTeam: vi.fn().mockResolvedValue(undefined), handleDeleteTeam: vi.fn(),
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
    mockUseTeamManagement.mockReturnValue({ ...base, teams: [{ id: '2', name: 'Zeta' }, { id: '1', name: 'Alpha' }] });
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
});
