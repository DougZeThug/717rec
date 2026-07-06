import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { WeeklyRecapData } from '@/services/WeeklyRecapService';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => mockAuth() }));

import HeroSection from '../HeroSection';
import MyNextMatchSkeleton from '../MyNextMatchSkeleton';
import WeeklyRecapCard from '../WeeklyRecapCard';
import WeeklyRecapSkeleton from '../WeeklyRecapSkeleton';

const recapData: WeeklyRecapData = { weekNumber: 10, upsets: [], hotStreaks: [], hasData: false };
const recapRiser: WeeklyPowerScoreTrend = {
  teamId: 't1',
  teamName: 'Heat',
  division: 'West',
  logoUrl: undefined,
  previousScore: 980,
  currentScore: 1005,
  delta: 2.5,
  percentChange: 2.6,
  currentWeek: 10,
  previousWeek: 9,
};

describe('skeleton to content transitions', () => {
  it('renders MyNextMatchSkeleton without match content', () => {
    render(<MyNextMatchSkeleton />);
    expect(screen.queryByText('Your Next Match')).not.toBeInTheDocument();
  });

  it('transitions WeeklyRecapSkeleton to WeeklyRecapCard', () => {
    const { rerender } = render(<WeeklyRecapSkeleton />);
    expect(screen.getByText('Weekly Recap')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <WeeklyRecapCard data={recapData} risers={[recapRiser]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Movers')).toBeInTheDocument();
  });
});

describe('auth-sensitive branches with mocked auth context', () => {
  it('asserts HeroSection under guest and authenticated mocks', () => {
    mockAuth.mockReturnValue({ user: null, profile: null });
    const { rerender } = render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );
    expect(screen.getAllByText('717Rec').length).toBeGreaterThan(0);
    mockAuth.mockReturnValue({ user: { id: 'u2' }, profile: { role: 'player' } });
    rerender(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/where bags fly and beers flow/i).length).toBeGreaterThan(0);
  });
});
