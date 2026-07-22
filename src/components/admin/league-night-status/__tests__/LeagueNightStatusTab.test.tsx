import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// The tab renders <CounterDriftCard/>, which runs a background counter-drift
// query. Stub the service so it resolves instantly (no network) — these tests
// don't assert on the card.
vi.mock('@/services/admin/DriftService', () => ({
  DriftService: {
    fetchDrift: vi.fn().mockResolvedValue([]),
    reconcile: vi.fn().mockResolvedValue(0),
  },
}));

import LeagueNightStatusTab from '../LeagueNightStatusTab';
import { OPS_LINKS } from '../opsLinks';

// CounterDriftCard uses TanStack Query hooks, so the tree needs a provider.
const renderTab = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <LeagueNightStatusTab />
    </QueryClientProvider>
  );

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
    renderTab();
    expect(screen.getByText(/realtime connected/i)).toBeInTheDocument();
    expect(screen.getByText(/ran .* ago/i)).toBeInTheDocument();
    expect(screen.queryByText(/stale/i)).not.toBeInTheDocument();
    expect(screen.getByText(/27 teams captured/i)).toBeInTheDocument();
  });

  it('shows a Stale badge for old snapshots', () => {
    mockUseLastPowerSnapshot.mockReturnValue({ data: staleSnapshot(), isLoading: false });
    renderTab();
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText(/older than 8 days/i)).toBeInTheDocument();
  });

  it('shows red state + hint when realtime errors', () => {
    mockUseRealtimeHealth.mockReturnValue({ state: 'error', lastChangeAt: new Date() });
    renderTab();
    expect(screen.getByText(/realtime error/i)).toBeInTheDocument();
    expect(screen.getByText(/refresh once/i)).toBeInTheDocument();
  });

  it('shows missing-snapshot state when no snapshot has ever been captured', () => {
    mockUseLastPowerSnapshot.mockReturnValue({ data: null, isLoading: false });
    renderTab();
    expect(screen.getByText(/no snapshot has ever been captured/i)).toBeInTheDocument();
  });

  it('clicking a queue tile switches admin tab via sessionStorage + reload', () => {
    mockUsePendingOpsCounts.mockReturnValue({
      data: { pendingScoreSubmissions: 3, pendingTeamRequests: 0, newContactRequests: 0 },
      isLoading: false,
    });
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: /score reports.*open section/i }));
    expect(sessionStorage.getItem('adminActiveTab')).toBe('pending-matches');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('quick actions open external links safely', () => {
    renderTab();
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
