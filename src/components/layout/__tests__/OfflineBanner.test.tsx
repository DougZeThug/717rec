import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OfflineBanner } from '../OfflineBanner';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  onlineManager.setOnline(true);
});

describe('OfflineBanner', () => {
  it('says nothing while the connection is fine', () => {
    render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });

  it('names the lost connection in a status region', () => {
    render(<OfflineBanner />);

    act(() => onlineManager.setOnline(false));

    const banner = screen.getByTestId('offline-banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveTextContent(/you are offline/i);
  });

  it('adds no second landmark to the page', () => {
    render(<OfflineBanner />);
    act(() => onlineManager.setOnline(false));

    // `role="banner"` would be a duplicate landmark on every page, which the
    // accessibility gate rejects (UX audit X-08).
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('confirms the connection is back, then gets out of the way', () => {
    render(<OfflineBanner showRecoveredForMs={4000} />);

    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    expect(screen.getByTestId('offline-banner')).toHaveTextContent(/back online/i);

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });

  it('does not congratulate a visit that was online the whole time', () => {
    render(<OfflineBanner />);
    act(() => onlineManager.setOnline(true));
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });
});
