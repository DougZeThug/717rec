import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTeamsQuery = vi.hoisted(() => vi.fn());
const mockUpdateTeam = vi.fn();

vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: () => mockUseTeamsQuery(),
}));

vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({
    divisions: [
      { id: 'div-east', name: 'East' },
      { id: 'div-west', name: 'West' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/usePendingMembershipCount', () => ({
  usePendingMembershipCount: () => ({ data: 0 }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: () => ({ createTeam: vi.fn() }),
}));

vi.mock('@/hooks/useUpdateTeam', () => ({
  useUpdateTeam: () => ({ updateTeam: mockUpdateTeam }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
}));

vi.mock('@/components/teams/TeamForm', () => ({
  default: ({ team, onCancel }: { team?: { name: string }; onCancel: () => void }) => (
    <div>
      <div>{team ? `Editing ${team.name}` : 'Create Team Form'}</div>
      <button onClick={onCancel}>Cancel Edit</button>
    </div>
  ),
}));

import TeamManagementTab from '../TeamManagementTab';

const teams = [
  { id: '1', name: 'Alpha', division_id: 'div-east', logoUrl: null, imageUrl: null },
  { id: '2', name: 'Bravo', division_id: null, logoUrl: null, imageUrl: null },
  { id: '3', name: 'Charlie', division_id: 'div-west', logoUrl: null, imageUrl: null },
];

const getComboboxByText = (text: string) => {
  const box = screen.getAllByRole('combobox').find((el) => el.textContent?.includes(text));
  expect(box).toBeDefined();
  if (!box) throw new Error(`Unable to find combobox with text: ${text}`);
  return box;
};

describe('TeamManagementTab', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTeam.mockResolvedValue();
    mockUseTeamsQuery.mockReturnValue({
      data: teams,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('applies search and division filters together', async () => {
    const user = userEvent.setup();
    render(<TeamManagementTab />);

    await user.type(screen.getByPlaceholderText(/search teams/i), 'a');
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getAllByRole('option', { name: 'West' })[0]);

    expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Alpha')).toHaveLength(0);
    expect(screen.queryAllByText('Bravo')).toHaveLength(0);
  });

  it('calls division reassignment callback with division id and null for unassigned', async () => {
    const user = userEvent.setup();
    render(<TeamManagementTab />);

    await user.click(getComboboxByText('East'));
    await user.click(screen.getAllByRole('option', { name: 'West' })[0]);

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith('1', expect.objectContaining({ division_id: 'div-west' }));
    });

    await user.click(getComboboxByText('West'));
    await user.click(screen.getAllByRole('option', { name: 'Unassigned' })[0]);

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith('3', expect.objectContaining({ division_id: null }));
    });
  });

  it('opens and closes edit dialog', async () => {
    const user = userEvent.setup();
    render(<TeamManagementTab />);

    const editButton = screen.getAllByRole('button').find((button) => button.querySelector('svg'));
    expect(editButton).toBeDefined();
    if (!editButton) throw new Error('Edit button not found');

    await user.click(editButton);
    expect(screen.getByText('Editing Alpha')).toBeInTheDocument();

    await user.click(screen.getByText('Cancel Edit'));
    expect(screen.queryByText('Editing Alpha')).not.toBeInTheDocument();
  });
});
