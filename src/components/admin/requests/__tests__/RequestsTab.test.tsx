import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamRequestWithTeam } from '@/types/teamRequest';

import RequestsTab from '../RequestsTab';

const mockUseAllRequests = vi.fn();
const mockUsePendingRequestsCount = vi.fn();
const mutateAsync = vi.fn();

vi.mock('@/hooks/useTeamRequests', () => ({
  useAllRequests: (...args: unknown[]) => mockUseAllRequests(...args),
  usePendingRequestsCount: () => mockUsePendingRequestsCount(),
  useUpdateRequestStatus: () => ({ mutateAsync, isPending: false }),
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
    mutateAsync.mockResolvedValue(undefined);
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
});
