import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTeamMembership = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));

import TeamMembershipSection from '../TeamMembershipSection';

const teams = [
  { id: 'team-1', name: 'Wolves' },
  { id: 'team-2', name: 'Hawks' },
];

const baseState = {
  membership: null as Record<string, unknown> | null,
  availableTeams: teams,
  isLoading: false,
  isFetching: false,
  error: null,
  joinTeam: vi.fn(),
  leaveTeam: vi.fn(),
};

const membership = (over: Record<string, unknown> = {}) => ({
  id: 'mem-1',
  user_id: 'user-1',
  team_id: 'team-1',
  joined_at: '2026-08-01T12:00:00.000Z',
  is_approved: false,
  team: { id: 'team-1', name: 'Wolves' },
  ...over,
});

describe('TeamMembershipSection', () => {
  // jsdom has no pointer capture or scrollIntoView, and the Radix select needs both.
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamMembership.mockReturnValue({ ...baseState });
  });

  it('names the team picker, since its placeholder is not a name', () => {
    render(<TeamMembershipSection />);

    expect(screen.getByRole('combobox', { name: 'Team to join' })).toBeInTheDocument();
  });

  it('shows a pending request as waiting for approval', () => {
    mockUseTeamMembership.mockReturnValue({ ...baseState, membership: membership() });
    render(<TeamMembershipSection />);

    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.queryByText('Request declined')).not.toBeInTheDocument();
  });

  // jsdom has no colours, so this pins the classes. White on green-600 was 3.1:1, and Pending's
  // "secondary" text turned white in dark, 2.8:1 on yellow-600. -700 fills with white pass 4.5:1
  // in light, dark and winter.
  it('draws the status badges dark enough for white text in every theme', () => {
    mockUseTeamMembership.mockReturnValue({ ...baseState, membership: membership() });
    const { unmount } = render(<TeamMembershipSection />);
    const pending = screen.getByText('Pending Approval');
    expect(pending).toHaveClass('bg-yellow-700', 'text-white');
    expect(pending).not.toHaveClass('bg-yellow-600', 'text-secondary-foreground');
    unmount();

    mockUseTeamMembership.mockReturnValue({
      ...baseState,
      membership: membership({ is_approved: true, approved_at: '2026-08-02T12:00:00.000Z' }),
    });
    render(<TeamMembershipSection />);
    // White set here: the default variant's text is dark navy in the winter theme.
    expect(screen.getByText('Approved')).toHaveClass('bg-green-700', 'text-white');
    expect(screen.getByText('Approved')).not.toHaveClass('bg-green-600');
    expect(screen.getByText('You can edit team details')).toHaveClass(
      'text-green-700',
      'dark:text-green-400'
    );
  });

  // At 390 px the button used to be pushed off the right edge of the card: the
  // row could not shrink, because nothing in it was allowed to. jsdom has no
  // layout, so this guards the rules that let it shrink.
  it('lets the membership card stack on a phone so Leave Team stays on screen', () => {
    mockUseTeamMembership.mockReturnValue({
      ...baseState,
      membership: membership({
        is_approved: true,
        approved_at: '2026-08-02T12:00:00.000Z',
        team: { id: 'team-1', name: 'The Extremely Long Team Name Society' },
      }),
    });
    const { container } = render(<TeamMembershipSection />);

    const name = screen.getByText('The Extremely Long Team Name Society');
    expect(name).toHaveClass('truncate');

    const row = container.querySelector('.flex-col.sm\\:flex-row');
    expect(row).not.toBeNull();
    expect(row).toContainElement(screen.getByRole('button', { name: /leave team/i }));

    // The text column must be allowed to shrink, or the button is pushed out.
    expect(name.closest('.min-w-0')).not.toBeNull();
  });

  it('shows an approved membership', () => {
    mockUseTeamMembership.mockReturnValue({
      ...baseState,
      membership: membership({ is_approved: true, approved_at: '2026-08-02T12:00:00.000Z' }),
    });
    render(<TeamMembershipSection />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave team/i })).toBeInTheDocument();
  });

  // B-18: a refusal used to delete the row, so this screen went back to looking
  // exactly as it had before the person asked. The row is now kept and marked,
  // and this is the state that says so.
  describe('a refused request', () => {
    const refused = () =>
      mockUseTeamMembership.mockReturnValue({
        ...baseState,
        membership: membership({ rejected_at: '2026-08-05T12:00:00.000Z' }),
      });

    it('says the request was declined', () => {
      refused();
      render(<TeamMembershipSection />);

      expect(screen.getByText('Request declined')).toBeInTheDocument();
      expect(screen.queryByText('Pending Approval')).not.toBeInTheDocument();
    });

    it('is not drawn as a membership, so there is nothing to leave', () => {
      refused();
      render(<TeamMembershipSection />);

      expect(screen.queryByRole('button', { name: /leave team/i })).not.toBeInTheDocument();
    });

    it('puts the join form back so they can ask again', async () => {
      const joinTeam = vi.fn();
      mockUseTeamMembership.mockReturnValue({
        ...baseState,
        membership: membership({ rejected_at: '2026-08-05T12:00:00.000Z' }),
        joinTeam,
      });
      render(<TeamMembershipSection />);

      expect(screen.getByRole('button', { name: /request to join/i })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /request to join/i }));
      // Nothing is sent until a team is chosen.
      expect(joinTeam).not.toHaveBeenCalled();
    });
  });

  // A failed request must not cost the person their pick: the hook shows the
  // error toast and resolves false, and the dropdown stays as it was so they
  // can press the button again. Only a sent request clears it.
  describe('the team pick after a join request', () => {
    const pickHawksAndSubmit = async (joinTeam: () => Promise<boolean>) => {
      mockUseTeamMembership.mockReturnValue({ ...baseState, joinTeam });
      render(<TeamMembershipSection />);

      await userEvent.click(screen.getByRole('combobox', { name: 'Team to join' }));
      await userEvent.click(await screen.findByRole('option', { name: /Hawks/ }));
      await userEvent.click(screen.getByRole('button', { name: /request to join/i }));
    };

    it('keeps the picked team when the request fails', async () => {
      const joinTeam = vi.fn().mockResolvedValue(false);
      await pickHawksAndSubmit(joinTeam);

      expect(joinTeam).toHaveBeenCalledWith('team-2');
      expect(screen.getByRole('combobox', { name: 'Team to join' })).toHaveTextContent('Hawks');
      expect(screen.getByRole('button', { name: /request to join/i })).toBeEnabled();
    });

    it('clears the picked team when the request is sent', async () => {
      const joinTeam = vi.fn().mockResolvedValue(true);
      await pickHawksAndSubmit(joinTeam);

      expect(joinTeam).toHaveBeenCalledWith('team-2');
      expect(screen.getByRole('combobox', { name: 'Team to join' })).toHaveTextContent(
        'Select a team to join'
      );
      expect(screen.getByRole('button', { name: /request to join/i })).toBeDisabled();
    });
  });
});
