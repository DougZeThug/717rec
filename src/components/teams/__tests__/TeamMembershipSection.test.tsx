import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamMembership.mockReturnValue({ ...baseState });
  });

  it('shows a pending request as waiting for approval', () => {
    mockUseTeamMembership.mockReturnValue({ ...baseState, membership: membership() });
    render(<TeamMembershipSection />);

    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.queryByText('Request declined')).not.toBeInTheDocument();
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
});
