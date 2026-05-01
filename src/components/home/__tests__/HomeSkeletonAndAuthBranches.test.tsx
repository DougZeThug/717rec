import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { WeeklyRecapData } from '@/services/WeeklyRecapService';
import { Match, Team } from '@/types';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth() }));
vi.mock('../MatchCard', () => ({ default: () => <div>real-match-card</div> }));

import CallToAction from '../CallToAction';
import HeroSection from '../HeroSection';
import MyNextMatchCard from '../MyNextMatchCard';
import MyNextMatchSkeleton from '../MyNextMatchSkeleton';
import RecentMatches from '../RecentMatches';
import RecentMatchesSkeleton from '../RecentMatchesSkeleton';
import WeeklyRecapCard from '../WeeklyRecapCard';
import WeeklyRecapSkeleton from '../WeeklyRecapSkeleton';

const sampleMatch: Match = {
  id: 'm10',
  team1Id: 't1',
  team2Id: 't2',
  date: '2026-03-01T19:00:00.000Z',
  team1_game_wins: 1,
  team2_game_wins: 2,
  week: null,
  season_id: 's1',
  status: 'completed',
  location: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const sampleTeam: Team = {
  id: 't1',
  name: 'Alpha',
  logo_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  captain_id: null,
  co_captain_id: null,
  division: null,
  league_id: null,
  is_active: true,
  archived_at: null,
};

const recapData: WeeklyRecapData = { weekNumber: 10, upsets: [], hotStreaks: [], hasData: false };
const recapRiser: WeeklyPowerScoreTrend = {
  teamId: 't1',
  teamName: 'Heat',
  division: 'West',
  logoUrl: null,
  previousScore: 980,
  currentScore: 1005,
  delta: 2.5,
  percentChange: 2.6,

};

describe('skeleton to content transitions', () => {
  it('transitions RecentMatchesSkeleton to RecentMatches', () => {
    const { rerender } = render(<RecentMatchesSkeleton />);
    expect(document.querySelector('#recent-matches-skeleton')).toBeTruthy();
    rerender(
      <RecentMatches
        completedMatches={[sampleMatch]}
        getTeamById={(id): Team => ({ ...sampleTeam, id, name: id })}
        formatDate={() => ''}
        formatTime={() => ''}
      />
    );
    expect(screen.getByText('real-match-card')).toBeInTheDocument();
  });

  it('transitions MyNextMatchSkeleton to MyNextMatchCard', () => {
    const { rerender } = render(<MyNextMatchSkeleton />);
    expect(screen.queryByText('Your Next Match')).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <MyNextMatchCard
          match={sampleMatch}
          myTeam={{ id: 't1', name: 'Alpha', logoUrl: null }}
          opponent={{ id: 't2', name: 'Beta', logoUrl: null }}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Your Next Match')).toBeInTheDocument();
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
  it('asserts CallToAction under guest and authenticated mocks', () => {
    mockAuth.mockReturnValue({ user: null, profile: null });
    const { rerender } = render(
      <MemoryRouter>
        <CallToAction />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /register now/i })).toBeInTheDocument();
    mockAuth.mockReturnValue({ user: { id: 'u1' }, profile: { role: 'admin' } });
    rerender(
      <MemoryRouter>
        <CallToAction />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /register now/i })).toBeInTheDocument();
  });

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
