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
  processingId: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TeamMembershipApprovalTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApproveMembership.mockResolvedValue(undefined);
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

  it('disables Approve button when processingId matches the membership', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership('mem-99')],
      processingId: 'mem-99',
    });

    render(<TeamMembershipApprovalTab />);

    // When processing, the button shows only a spinner — no "Approve" text
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    // The spinner is visible inside the Approve button area
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('disables Reject button when processingId matches the membership', () => {
    mockUsePendingMemberships.mockReturnValue({
      ...defaultHookState,
      pendingMemberships: [makeMembership('mem-99')],
      processingId: 'mem-99',
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
