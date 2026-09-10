import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TeamRequest } from '@/types/teamRequest';

import RequestHistoryList from '../RequestHistoryList';

const request = (overrides: Partial<TeamRequest> = {}): TeamRequest => ({
  id: 'req-1',
  team_id: 'team-1',
  season_id: null,
  request_type: 'TIME_CHANGE',
  status: 'PENDING',
  match_date: '2026-09-17',
  current_timeslot: '6:00 PM',
  requested_timeslot: '7:00 PM',
  reason: null,
  admin_notes: null,
  submitted_by: null,
  submitted_by_name: null,
  processed_by: null,
  processed_at: null,
  created_at: '2026-09-10T12:00:00.000Z',
  updated_at: '2026-09-10T12:00:00.000Z',
  ...overrides,
});

describe('RequestHistoryList', () => {
  it('says what was asked for, how it went and for which night', () => {
    render(<RequestHistoryList requests={[request()]} isLoading={false} onBack={vi.fn()} />);

    expect(screen.getByText('Time Change')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Sep 17, 2026')).toBeInTheDocument();
  });

  it('marks a refused request as refused rather than merely waiting', () => {
    render(
      <RequestHistoryList
        requests={[request({ status: 'DENIED' })]}
        isLoading={false}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('says so when a team has never asked for anything', () => {
    render(<RequestHistoryList requests={[]} isLoading={false} onBack={vi.fn()} />);

    expect(screen.getByText('No requests yet')).toBeInTheDocument();
  });

  // Nothing is empty until it has been looked for.
  it('does not claim there is nothing while it is still loading', () => {
    render(<RequestHistoryList requests={undefined} isLoading onBack={vi.fn()} />);

    expect(screen.queryByText('No requests yet')).not.toBeInTheDocument();
  });

  it('goes back to the form', async () => {
    const onBack = vi.fn();
    render(<RequestHistoryList requests={[]} isLoading={false} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back to form' }));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
