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

/** A real id: the address Timeslots reads only accepts one. */
const TEAM_ID = '3f1b2c8e-5a41-4c9d-9f2a-77b0d6e8c123';

const baseRequest: TeamRequestWithTeam = {
  id: 'req-1',
  team_id: TEAM_ID,
  season_id: null,
  request_type: 'TIME_CHANGE',
  status: 'PENDING',
  match_date: '2026-09-17',
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

  it('rejects a request and omits empty admin notes', async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /reject/i }));
    expect(screen.getByText('Reject Request')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reject' }));

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

  it('hides approve/reject actions for non-pending requests', () => {
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

  /** Approve the one request on screen and hand back the toast it raised. */
  const approve = async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /approve/i }));
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    const [toastProps] = mockToast.mock.calls[0];
    return { user, ...toastProps };
  };

  /** Press the toast's button and hand back the address it asked for. */
  const openTimeslots = async (user: ReturnType<typeof userEvent.setup>, action: unknown) => {
    render(action as React.ReactElement);
    await user.click(screen.getByRole('button', { name: 'Open Timeslots' }));

    const [tabId, search] = mockSwitchAdminTab.mock.calls[0];
    expect(tabId).toBe('timeslots');
    return new URLSearchParams(search as string);
  };

  // UX audit A-05 and L4: approving a request only writes a status word.
  // Nothing in the schedule moves, so the toast carries every fact the screen
  // that does move it needs — the night, the team and the block.
  it('sends a time change to Timeslots with the night, the team and the block', async () => {
    const { user, title, description, action } = await approve();

    // The mutation's own generic toast is suppressed, so the admin gets one
    // message rather than two near-identical ones.
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ suppressSuccessToast: true })
    );
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(title).toBe('Request approved');
    expect(description).toContain('The Baggers');
    expect(description).toContain('8:00 + 8:30 PM');

    const params = await openTimeslots(user, action);
    expect(params.get('date')).toBe('2026-09-17');
    expect(params.get('team')).toBe(TEAM_ID);
    expect(params.get('slot')).toBe('8:00 PM');
  });

  it('sends a bye request to Timeslots with the bye already chosen', async () => {
    mockUseAllRequests.mockReturnValue({
      data: [{ ...baseRequest, request_type: 'BYE_REQUEST', requested_timeslot: null }],
      isLoading: false,
    });

    const { user, description, action } = await approve();

    expect(description).toContain('bye');
    expect((await openTimeslots(user, action)).get('slot')).toBe('BYE');
  });

  // An approved cancellation means the team is not playing that night, which
  // is what a bye records.
  it('sends an emergency cancellation the same way', async () => {
    mockUseAllRequests.mockReturnValue({
      data: [{ ...baseRequest, request_type: 'EMERGENCY_CANCEL', requested_timeslot: null }],
      isLoading: false,
    });

    const { user, action } = await approve();

    expect((await openTimeslots(user, action)).get('slot')).toBe('BYE');
  });

  // The requested time is free text with no validation. Nothing is chosen on a
  // guess; the words the team used are quoted back instead.
  it('chooses no block when the requested time is not one', async () => {
    mockUseAllRequests.mockReturnValue({
      data: [{ ...baseRequest, requested_timeslot: 'as early as possible' }],
      isLoading: false,
    });

    const { user, description, action } = await approve();

    expect(description).toContain('"as early as possible"');

    const params = await openTimeslots(user, action);
    expect(params.get('slot')).toBeNull();
    expect(params.get('team')).toBe(TEAM_ID);
  });

  it('says so when the request never named a night', async () => {
    mockUseAllRequests.mockReturnValue({
      data: [{ ...baseRequest, match_date: null }],
      isLoading: false,
    });

    const { user, description, action } = await approve();

    expect(description).toContain('did not name a night');
    expect((await openTimeslots(user, action)).get('date')).toBeNull();
  });

  it('does not point at Timeslots when rejecting', async () => {
    const user = userEvent.setup();
    render(<RequestsTab />);

    await user.click(screen.getByRole('button', { name: /reject/i }));
    await user.click(screen.getByRole('button', { name: 'Reject' }));

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
