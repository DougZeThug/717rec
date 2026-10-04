import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseTeamMembership, mockToast, mockUpdateTeam, mockRefresh } = vi.hoisted(() => ({
  mockUseTeamMembership: vi.fn(),
  mockToast: vi.fn(),
  mockUpdateTeam: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock('@/hooks/useTeamMembership', () => ({ useTeamMembership: () => mockUseTeamMembership() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/services/teams/TeamUpdateService', () => ({
  updateTeamNameAndImage: mockUpdateTeam,
}));
vi.mock('@/utils/logger', () => ({ errorLog: vi.fn() }));
vi.mock('@/components/shared/TeamLogo', () => ({
  TeamLogo: ({ teamName }: { teamName: string }) => <span data-testid="logo">{teamName}</span>,
}));

import TeamEditSection from '../TeamEditSection';

const approved = {
  is_approved: true,
  team: { id: 'team-1', name: 'Corn Stars', imageUrl: null, logoUrl: null },
};

const renderSection = () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <TeamEditSection />
    </QueryClientProvider>
  );
  return { invalidate, user: userEvent.setup() };
};

describe('TeamEditSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamMembership.mockReturnValue({ membership: approved, refreshMembership: mockRefresh });
    mockUpdateTeam.mockImplementation(() => Promise.resolve());
  });

  it.each([
    ['no membership', null],
    ['a membership that is not approved yet', { ...approved, is_approved: false }],
    ['an approved membership with no team', { is_approved: true, team: null }],
  ])('shows nothing for %s', (_label, membership) => {
    mockUseTeamMembership.mockReturnValue({ membership, refreshMembership: mockRefresh });
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <TeamEditSection />
      </QueryClientProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the team and an edit button to an approved member', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: 'Corn Stars' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit team details/i })).toBeInTheDocument();
  });

  it('fills the form with the current name and blocks saving an empty name', async () => {
    const { user } = renderSection();
    await user.click(screen.getByRole('button', { name: /edit team details/i }));

    const name = screen.getByLabelText('Team Name');
    expect(name).toHaveValue('Corn Stars');

    await user.clear(name);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('previews the image once a URL is typed', async () => {
    const { user } = renderSection();
    await user.click(screen.getByRole('button', { name: /edit team details/i }));

    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Team Image URL'), 'https://example.com/logo.png');

    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('saves a trimmed name, refreshes the team lists and closes the form', async () => {
    const { user, invalidate } = renderSection();
    await user.click(screen.getByRole('button', { name: /edit team details/i }));
    const name = screen.getByLabelText('Team Name');
    await user.clear(name);
    await user.type(name, '  Cornholio  ');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', 'Cornholio', null));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Team Updated' }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['teams'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['team-details', 'team-1'] });
    expect(screen.getByRole('button', { name: /edit team details/i })).toBeInTheDocument();
  });

  it('keeps the form open and shows an error toast when saving fails', async () => {
    mockUpdateTeam.mockRejectedValue(new Error('db down'));
    const { user } = renderSection();
    await user.click(screen.getByRole('button', { name: /edit team details/i }));

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Couldn't update team", variant: 'destructive' })
      )
    );
    expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('closes the form without saving when the member cancels', async () => {
    const { user } = renderSection();
    await user.click(screen.getByRole('button', { name: /edit team details/i }));

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockUpdateTeam).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /edit team details/i })).toBeInTheDocument();
  });
});
