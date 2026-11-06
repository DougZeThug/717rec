import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockApproveMembership = vi.fn();
const mockToast = vi.fn();

// Hoisted so it is available inside the vi.mock factory below
const mockUsePendingMemberships = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/usePendingMemberships', () => ({
  usePendingMemberships: () => mockUsePendingMemberships(),
}));

vi.mock('@/components/shared/TeamLogo', () => ({
  TeamLogo: ({ teamName }: { teamName: string }) => <div data-testid={`team-logo-${teamName}`} />,
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
  useSeasonalThemeBase: () => ({ theme: 'light' }),
  default: () => ({ isWinterTheme: false }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import TeamMembershipApprovalTab from '../TeamMembershipApprovalTab';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeMembership = (id = 'mem-1') => ({
  id,
  user: {
    avatar_url: null,
    full_name: `User ${id}`,
    username: `user_${id}`,
  },
  team: {
    name: `Team ${id}`,
    image_url: null,
    logo_url: null,
  },
  joined_at: '2025-01-15T10:00:00Z',
});

const defaultHookState = {
  pendingMemberships: [],
  isLoading: false,
  isError: false,
  error: null,
  approveMembership: mockApproveMembership,
  processingIds: new Set<string>(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TeamMembershipApprovalTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApproveMembership.mockImplementation(() => Promise.resolve());
    mockUsePendingMemberships.mockReturnValue({ ...defaultHookState });
  });

  it('renders loading spinner when isLoading is true', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      isLoading: true,
    });

    render(<TeamMembershipApprovalTab />);

    // Loader2 icon spins — check by its role or presence of the spinner
    expect(screen.queryByText(/team membership approvals/i)).not.toBeInTheDocument();
    // The loading state renders nothing but a spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error card when isError is true', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      isError: true,
      error: new Error('Failed to fetch'),
    });

    render(<TeamMembershipApprovalTab />);

    expect(screen.getByText('Failed to load memberships')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('renders "All caught up!" when no pending memberships', () => {
    render(<TeamMembershipApprovalTab />);

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText('0 pending')).toBeInTheDocument();
  });

  it('renders membership cards with user and team names', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership('mem-1'), makeMembership('mem-2')],
    });

    render(<TeamMembershipApprovalTab />);

    expect(screen.getByText('User mem-1')).toBeInTheDocument();
    expect(screen.getByText('Team mem-1')).toBeInTheDocument();
    expect(screen.getByText('User mem-2')).toBeInTheDocument();
    expect(screen.getByText('Team mem-2')).toBeInTheDocument();
    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  // jsdom does no layout, so this pins the classes. The person, team and date sat in one
  // no-wrap row 390px wide, which stretched the card past every phone screen.
  it('lets the person, team and date wrap onto more rows instead of widening the card', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);

    const person = screen.getByText('User mem-1').closest('div.flex.flex-wrap');
    const row = person?.parentElement;
    expect(person).not.toBeNull();
    // Only a gap between rows: a sideways gap would make a row that fits at 768px wrap.
    expect(row).toHaveClass('flex-wrap', 'gap-y-2');
    expect(screen.getByText('User mem-1')).toHaveClass('wrap-break-word');
    expect(screen.getByText('Team mem-1')).toHaveClass('wrap-break-word');
  });

  // jsdom does no layout, so this pins the classes. A name with no spaces ("johnnythecorn...")
  // widened its card past a 320px screen: the card list was a grid column sized by its widest
  // content, and none of the flex parts above the name could shrink.
  it('lets a long name with no spaces shrink instead of widening the card', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);

    const person = screen.getByText('User mem-1').closest('div.flex.flex-wrap');
    expect(screen.getByText('User mem-1').closest('div.grid')).toHaveClass('grid-cols-1');
    expect(person).toHaveClass('min-w-0');
    expect(screen.getByText('User mem-1').parentElement?.parentElement).toHaveClass('min-w-0');
    expect(screen.getByText('Team mem-1')).toHaveClass('min-w-0');
    expect(screen.getByText('Team mem-1').parentElement).toHaveClass('min-w-0');
    // The letter avatar must keep its 32px round shape while the text shrinks beside it.
    expect(screen.getByText('U').parentElement).toHaveClass('shrink-0');
  });

  it('shows joined date on each card', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);

    // Date formatted via toLocaleDateString — just check it's present
    expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument();
  });

  it('calls approveMembership with (id, true) when Approve is clicked', async () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership('mem-42')],
    });

    render(<TeamMembershipApprovalTab />);

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    expect(mockApproveMembership).toHaveBeenCalledWith('mem-42', true);
  });

  it('shows success toast after approval', async () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Membership Approved' })
      );
    });
  });

  it('opens AlertDialog when Reject is clicked and confirms rejection', async () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership('mem-7')],
    });

    render(<TeamMembershipApprovalTab />);

    // Click the Reject trigger button
    await userEvent.click(screen.getByRole('button', { name: /reject/i }));

    // AlertDialog content should appear
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // Confirm rejection
    await userEvent.click(screen.getByRole('button', { name: /reject request/i }));

    expect(mockApproveMembership).toHaveBeenCalledWith('mem-7', false);
  });

  // B-18: the prompt used to read "The user will be removed from the team",
  // which describes an approved membership. Every row in this queue is a
  // request that was never approved, so nobody is being removed from anything.
  it('describes a pending request, not a membership being ended', async () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);
    await userEvent.click(screen.getByRole('button', { name: /reject/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).not.toHaveTextContent(/removed from the team/i);
    expect(dialog).toHaveTextContent(/request to join/i);
    expect(dialog).toHaveTextContent(/can ask again/i);
  });

  it('shows rejection toast after confirming reject', async () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);

    await userEvent.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /reject request/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Membership Rejected' })
      );
    });
  });

  it('cancelling the AlertDialog does not call approveMembership', async () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);

    await userEvent.click(screen.getByRole('button', { name: /reject/i }));
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockApproveMembership).not.toHaveBeenCalled();
  });

  it('disables Approve button while that row is saving', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership('mem-99')],
      processingIds: new Set(['mem-99']),
    });

    render(<TeamMembershipApprovalTab />);

    // When processing, the button shows only a spinner — no "Approve" text
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    // The spinner is visible inside the Approve button area
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('disables Reject button while that row is saving', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership('mem-99')],
      processingIds: new Set(['mem-99']),
    });

    render(<TeamMembershipApprovalTab />);

    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('shows error toast when approveMembership throws', async () => {
    mockApproveMembership.mockRejectedValue(new Error('Network error'));
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership()],
    });

    render(<TeamMembershipApprovalTab />);

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    });
  });
});
