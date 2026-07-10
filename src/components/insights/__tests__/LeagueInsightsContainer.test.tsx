import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LeagueInsightsData } from '@/hooks/useLeagueInsights';

const mockUseLeagueInsights = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useLeagueInsights', () => ({
  useLeagueInsights: () => mockUseLeagueInsights(),
}));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme: false }),
}));

import LeagueInsightsContainer from '../LeagueInsightsContainer';

const base: LeagueInsightsData = {
  overview: null,
  divisionStrength: [],
  parity: null,
  topPerformers: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

describe('LeagueInsightsContainer error state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeagueInsights.mockReturnValue({ ...base });
  });

  it('renders a retryable error state when the fetch fails', async () => {
    const refetch = vi.fn();
    mockUseLeagueInsights.mockReturnValue({ ...base, error: new Error('boom'), refetch });
    render(<LeagueInsightsContainer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/could not load league insights/i)).toBeInTheDocument();
    // Must not fall through to the "No Data Yet" empty state.
    expect(screen.queryByText('No Data Yet')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state (not an error) when there is no error and no data', () => {
    render(<LeagueInsightsContainer />);
    expect(screen.getByText('No Data Yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('prefers the loading state over the error state', () => {
    mockUseLeagueInsights.mockReturnValue({ ...base, isLoading: true, error: new Error('boom') });
    render(<LeagueInsightsContainer />);
    expect(screen.getByText('Crunching the numbers...')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
