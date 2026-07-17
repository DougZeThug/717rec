import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LastPowerSnapshot } from '@/services/opsHealth/OpsHealthService';

const mockUseLastPowerSnapshot = vi.fn();
const mockUsePendingOpsCounts = vi.fn();
const mockUseRealtimeHealth = vi.fn();

vi.mock('@/hooks/useOpsHealth', () => ({
  useLastPowerSnapshot: () => mockUseLastPowerSnapshot(),
  usePendingOpsCounts: () => mockUsePendingOpsCounts(),
  useRealtimeHealth: () => mockUseRealtimeHealth(),
}));

vi.mock('../TrafficMiniChart', () => ({
  default: () => <div data-testid="traffic-mini-chart" />,
}));

vi.mock('../CounterDriftCard', () => ({
  default: () => <div data-testid="counter-drift-card" />,
}));

import LeagueNightStatusTab from '../LeagueNightStatusTab';
import { OPS_LINKS } from '../opsLinks';

const freshSnapshot = (): LastPowerSnapshot => ({
  created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  snapshot_date: '2026-07-15',
  week_number: 4,
  season_id: 'season-1',
  row_count: 27,
});

const staleSnapshot = (): LastPowerSnapshot => ({
  ...freshSnapshot(),
  created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
});

const setDefaults = () => {
  mockUseRealtimeHealth.mockReturnValue({ state: 'connected', lastChangeAt: new Date() });
  mockUseLastPowerSnapshot.mockReturnValue({ data: freshSnapshot(), isLoading: false });
  mockUsePendingOpsCounts.mockReturnValue({
    data: { pendingScoreSubmissions: 0, pendingTeamRequests: 0, newContactRequests: 0 },
    isLoading: false,
  });
};

describe('LeagueNightStatusTab', () => {
  let originalReload: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    setDefaults();
    originalReload = window.location.reload;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
    sessionStorage.clear();
  });

  it('renders happy path: connected + fresh snapshot + zero pending', () => {
    render(<LeagueNightStatusTab />);
    expect(screen.getByText(/realtime connected/i)).toBeInTheDocument();
    expect(screen.getByText(/ran .* ago/i)).toBeInTheDocument();
    expect(screen.queryByText(/stale/i)).not.toBeInTheDocument();
    expect(screen.getByText(/27 teams captured/i)).toBeInTheDocument();
  });

  it('shows a Stale badge for old snapshots', () => {
    mockUseLastPowerSnapshot.mockReturnValue({ data: staleSnapshot(), isLoading: false });
    render(<LeagueNightStatusTab />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText(/older than 8 days/i)).toBeInTheDocument();
  });

  it('shows red state + hint when realtime errors', () => {
    mockUseRealtimeHealth.mockReturnValue({ state: 'error', lastChangeAt: new Date() });
    render(<LeagueNightStatusTab />);
    expect(screen.getByText(/realtime error/i)).toBeInTheDocument();
    expect(screen.getByText(/refresh once/i)).toBeInTheDocument();
  });

  it('shows missing-snapshot state when no snapshot has ever been captured', () => {
    mockUseLastPowerSnapshot.mockReturnValue({ data: null, isLoading: false });
    render(<LeagueNightStatusTab />);
    expect(screen.getByText(/no snapshot has ever been captured/i)).toBeInTheDocument();
  });

  it('clicking a queue tile switches admin tab via sessionStorage + reload', () => {
    mockUsePendingOpsCounts.mockReturnValue({
      data: { pendingScoreSubmissions: 3, pendingTeamRequests: 0, newContactRequests: 0 },
      isLoading: false,
    });
    render(<LeagueNightStatusTab />);

    fireEvent.click(screen.getByRole('button', { name: /score reports.*open section/i }));
    expect(sessionStorage.getItem('adminActiveTab')).toBe('pending-matches');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('quick actions open external links safely', () => {
    render(<LeagueNightStatusTab />);
    const supabaseLink = screen.getByRole('link', { name: /supabase status/i });
    expect(supabaseLink).toHaveAttribute('href', OPS_LINKS.supabaseStatus);
    expect(supabaseLink).toHaveAttribute('target', '_blank');
    expect(supabaseLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: originalReload },
    });
  });
});
