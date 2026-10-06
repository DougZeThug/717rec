import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { SyncStatusNotice } from '../SyncStatusNotice';

describe('SyncStatusNotice', () => {
  it('says nothing when the signal is good and nothing is waiting', () => {
    render(<SyncStatusNotice isOnline pausedCount={0} />);
    expect(screen.queryByTestId('round-sync-status')).not.toBeInTheDocument();
  });

  it('tells an offline scorer to keep the page open before anything is filed', () => {
    render(<SyncStatusNotice isOnline={false} pausedCount={0} />);

    const notice = screen.getByTestId('round-sync-status');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent(
      'Offline — keep this page open. Rounds send when the signal is back.'
    );
  });

  it('counts one round waiting', () => {
    render(<SyncStatusNotice isOnline={false} pausedCount={1} />);
    expect(screen.getByTestId('round-sync-status')).toHaveTextContent(
      'Offline — 1 round waiting to sync. Keep this page open.'
    );
  });

  it('counts more than one', () => {
    render(<SyncStatusNotice isOnline={false} pausedCount={3} />);
    expect(screen.getByTestId('round-sync-status')).toHaveTextContent(
      'Offline — 3 rounds waiting to sync. Keep this page open.'
    );
  });

  // Held rounds live in memory, so a reload or closed tab loses them. No
  // offline line may promise a send without saying to keep the page open.
  it.each([0, 1, 3])('never promises a send without "keep this page open" (%i waiting)', (n) => {
    render(<SyncStatusNotice isOnline={false} pausedCount={n} />);

    const notice = screen.getByTestId('round-sync-status');
    expect(notice).not.toHaveTextContent(/send themselves/iu);
    expect(notice).toHaveTextContent(/keep this page open/iu);
  });

  it('says they are going out once the signal is back', () => {
    render(<SyncStatusNotice isOnline pausedCount={2} />);
    expect(screen.getByTestId('round-sync-status')).toHaveTextContent('Sending 2 rounds…');
  });
});
