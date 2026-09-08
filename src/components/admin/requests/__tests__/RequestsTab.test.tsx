import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamRequestWithTeam } from '@/types/teamRequest';

import RequestsTab from '../RequestsTab';

const mockUseAllRequests = vi.fn();
const mockUsePendingRequestsCount = vi.fn();
const mutateAsync = vi.fn(() => Promise.resolve());

const mockToast = vi.fn();

vi.mock('@/hooks/useTeamRequests', () => ({
  useAllRequests: (...args: unknown[]) => mockUseAllRequests(...args),
  usePendingRequestsCount: () => mockUsePendingRequestsCount(),
  useUpdateRequestStatus: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: (...args: unknown[]) => mockToast(...args),
}));

const mockSwitchAdminTab = vi.fn();

vi.mock('@/utils/adminTabs', () => ({
  switchAdminTab: (...args: unknown[]) => mockSwitchAdminTab(...args),
}));

const baseRequest: TeamRequestWithTeam = {
  id: 'req-1',
  team_id: 't1',
  season_id: null,
  request_type: 'TIME_CHANGE',
  status: 'PENDING',
  match_date: null,
  current_timeslot: '6:00 PM',
  requested_timeslot: '8:00 PM',
  reason: 'Work conflict',
  admin_notes: null,
  submitted_by: null,
  submitted_by_name: 'Casey',
  processed_by: null,
  processed_at: null,
  created_at: '2026-06-01T12:00:00.000Z',
  updated_at: '2026-06-01T12:00:00.000Z',
  teams: { name: 'The Baggers' },
};

describe('RequestsTab', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue();
    mockUseAllRequests.mockReturnValue({ data: [baseRequest], isLoading: false });
    mockUsePendingRequestsCount.mockReturnValue({ data: 1 });
  });

  it('defaults to the PENDING filter and shows the pending badge count', () => {
    render(<RequestsTab />);
    expect(mockUseAllRequests).toHaveBeenCalledWith('PENDING');
    expect(screen.getByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('The Baggers')).toBeInTheDocument();
    expect(screen.getByText('Time Change')).toBeInTheDocument();
  });

  it('approves a request with admin notes and resets the dialog', async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(screen.getByText('Approve Request')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Admin notes'), 'Slot freed up');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'req-1',
        status: 'APPROVED',
        admin_notes: 'Slot freed up',
        suppressSuccessToast: true,
      })
    );
    await waitFor(() => expect(screen.queryByText('Approve Request')).not.toBeInTheDocument());
  });

  it('denies a request and omits empty admin notes', async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /deny/i }));
    expect(screen.getByText('Deny Request')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deny' }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'req-1',
        status: 'DENIED',
        admin_notes: undefined,
        suppressSuccessToast: false,
      })
    );
  });

  it('cancels the dialog without calling the mutation', async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Approve Request')).not.toBeInTheDocument());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('hides approve/deny actions for non-pending requests', () => {
    mockUseAllRequests.mockReturnValue({
      data: [{ ...baseRequest, status: 'APPROVED', admin_notes: 'done' }],
      isLoading: false,
    });
    render(<RequestsTab />);
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByText('Admin notes:')).toBeInTheDocument();
  });

  it('shows the empty state with a filter hint', () => {
    mockUseAllRequests.mockReturnValue({ data: [], isLoading: false });
    mockUsePendingRequestsCount.mockReturnValue({ data: 0 });
    render(<RequestsTab />);
    expect(screen.getByText('No requests found')).toBeInTheDocument();
    expect(screen.getByText('Try changing the filter')).toBeInTheDocument();
  });

  // UX audit A-05: approving a TIME_CHANGE only writes a status word. Nothing
  // in the schedule moves, and the dialog offered no route to where it does.
  it('points the admin at Timeslots after approving a time change', async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    // The mutation's own generic toast is suppressed, so the admin gets one
    // message rather than two near-identical ones.
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ suppressSuccessToast: true })
    );
    expect(mockToast).toHaveBeenCalledTimes(1);

    const [{ title, description, action }] = mockToast.mock.calls[0];
    expect(title).toBe('Request approved');
    expect(description).toContain('The Baggers');
    expect(description).toContain('8:00 PM');
    expect(description).toContain('Timeslots');

    // The toast action opens the section where the move is actually made.
    render(action as React.ReactElement);
    await user.click(screen.getByRole('button', { name: 'Open Timeslots' }));
    expect(mockSwitchAdminTab).toHaveBeenCalledWith('timeslots');
  });

  it('does not point at Timeslots when denying', async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /deny/i }));
    await user.click(screen.getByRole('button', { name: 'Deny' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    // The mutation keeps its own generic toast for this path.
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ suppressSuccessToast: false })
    );
    expect(mockToast).not.toHaveBeenCalled();
  });

  // UX audit A-05: an unwrapped mutateAsync skipped every reset on failure,
  // leaving the dialog open with a live button and an unhandled rejection.
  it('keeps the dialog open when the update fails, instead of resetting', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error('network down'));
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await user.type(screen.getByLabelText('Admin notes'), 'Slot freed up');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());

    // Still open, notes intact, and no success toast.
    expect(screen.getByText('Approve Request')).toBeInTheDocument();
    expect(screen.getByLabelText('Admin notes')).toHaveValue('Slot freed up');
    expect(mockToast).not.toHaveBeenCalled();
  });
});
