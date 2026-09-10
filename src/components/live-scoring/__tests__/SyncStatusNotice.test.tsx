import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { SyncStatusNotice } from '../SyncStatusNotice';

describe('SyncStatusNotice', () => {
  it('says nothing when the signal is good and nothing is waiting', () => {
    render(<SyncStatusNotice isOnline pausedCount={0} />);
    expect(screen.queryByTestId('round-sync-status')).not.toBeInTheDocument();
  });

  it('tells an offline scorer to keep going before anything is filed', () => {
    render(<SyncStatusNotice isOnline={false} pausedCount={0} />);

    const notice = screen.getByTestId('round-sync-status');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent(/offline — keep scoring/iu);
  });

  it('counts one round waiting', () => {
    render(<SyncStatusNotice isOnline={false} pausedCount={1} />);
    expect(screen.getByTestId('round-sync-status')).toHaveTextContent(
      'Offline — 1 round waiting to sync.'
    );
  });

  it('counts more than one', () => {
    render(<SyncStatusNotice isOnline={false} pausedCount={3} />);
    expect(screen.getByTestId('round-sync-status')).toHaveTextContent(
      'Offline — 3 rounds waiting to sync.'
    );
  });

  it('says they are going out once the signal is back', () => {
    render(<SyncStatusNotice isOnline pausedCount={2} />);
    expect(screen.getByTestId('round-sync-status')).toHaveTextContent('Sending 2 rounds…');
  });
});
