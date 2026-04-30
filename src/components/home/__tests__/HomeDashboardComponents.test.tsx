import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { WeeklyRecapData } from '@/services/WeeklyRecapService';
import { Match, Team } from '@/types';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';

type PendingMatchStub = {
  id: string;
  team1_name: string;
  team2_name: string;
  team1_logo: string | null;
  team2_logo: string | null;
  date: string;
};

type PendingScoresState = {
  isLoading: boolean;
  matches: PendingMatchStub[];
};

let pendingState: PendingScoresState = { isLoading: false, matches: [] };
vi.mock('@/hooks/usePendingScoresMatches', () => ({
  usePendingScoresMatches: () => pendingState,
}));
vi.mock('@/hooks/useTeamBadges', () => ({ useAllTeamBadges: () => ({ data: [] }) }));

vi.mock('../MatchCard', () => ({ default: ({ match }: { match: { id: string } }) => <div>match-card-{match.id}</div> }));
vi.mock('../ScoreSubmissionModal', () => ({ ScoreSubmissionModal: ({ open }: { open: boolean }) => (open ? <div>score-modal</div> : null) }));
vi.mock('../TeamCard', () => ({ default: ({ team }: { team: Pick<Team, 'name'> }) => <div>{team.name}</div> }));
vi.mock('../TeamCardCompact', () => ({ default: ({ team }: { team: Pick<Team, 'name'> }) => <div>{team.name}</div> }));
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import MyNextMatchCard from '../MyNextMatchCard';
import PendingScoresCard from '../PendingScoresCard';
import RecentMatches from '../RecentMatches';
import TeamOfTheWeekCard from '../TeamOfTheWeekCard';
import TopTeams from '../TopTeams';
import WeeklyRecapCard from '../WeeklyRecapCard';

const baseMatch: Match = {
  id: 'm1',
  team1Id: 't1',
  team2Id: 't2',
  date: '2026-02-14T18:00:00.000Z',
  team1_game_wins: 2,
  team2_game_wins: 1,
  week: null,
  season_id: 's1',
  status: 'completed',
  location: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const baseTeam: Team = {
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

const weeklyRecapBase: WeeklyRecapData = { weekNumber: 8, upsets: [], hotStreaks: [] };

const risingTrend: WeeklyPowerScoreTrend = {
  teamId: 't9',
  teamName: 'Clutch',
  division: 'East',
  logoUrl: null,
  previousScore: 900,
  currentScore: 931,
  delta: 3.1,
  percentChange: 3.4,
};

describe('home dashboard cards', () => {
  it('covers MyNextMatchCard normal and previous states', () => {
    const common = { match: baseMatch, myTeam: { id: 't1', name: 'Alpha', logoUrl: null }, opponent: { id: 't2', name: 'Beta', logoUrl: null } };
    const { rerender } = render(<MemoryRouter><MyNextMatchCard {...common} weekNumber={4} /></MemoryRouter>);
    expect(screen.getByText('Your Next Match')).toBeInTheDocument();
    rerender(<MemoryRouter><MyNextMatchCard {...common} isPrevious /></MemoryRouter>);
    expect(screen.getByText('Win')).toBeInTheDocument();
  });

  it('covers PendingScoresCard loading, empty, and populated states', () => {
    pendingState = { isLoading: true, matches: [] };
    const { rerender } = render(<MemoryRouter><PendingScoresCard /></MemoryRouter>);
    expect(screen.getByText('Matches awaiting score reports')).toBeInTheDocument();
    pendingState = { isLoading: false, matches: [] };
    rerender(<MemoryRouter><PendingScoresCard /></MemoryRouter>);
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    pendingState = {
      isLoading: false,
      matches: [{ id: 'p1', team1_name: 'Gamma', team2_name: 'Delta', team1_logo: null, team2_logo: null, date: '2026-02-14T18:00:00.000Z' }],
    };
    rerender(<MemoryRouter><PendingScoresCard /></MemoryRouter>);
    expect(screen.getByText('1 match awaiting score reports')).toBeInTheDocument();
  });

  it('covers RecentMatches loading, empty, and normal states', () => {
    const getTeamById = (id: string): Team => ({ ...baseTeam, id, name: id });
    const { rerender } = render(<RecentMatches completedMatches={[]} getTeamById={getTeamById} formatDate={() => ''} formatTime={() => ''} isLoading />);
    expect(document.querySelector('#recent-matches-skeleton')).toBeTruthy();
    rerender(<RecentMatches completedMatches={[]} getTeamById={getTeamById} formatDate={() => ''} formatTime={() => ''} />);
    rerender(<RecentMatches completedMatches={[baseMatch]} getTeamById={getTeamById} formatDate={() => ''} formatTime={() => ''} />);
    expect(screen.getByText('match-card-m1')).toBeInTheDocument();
  });
});

describe('leaderboard and highlight widgets', () => {
  it('verifies TopTeams fallback and populated formatting', () => {
    const { rerender } = render(<MemoryRouter><TopTeams teams={[]} /></MemoryRouter>);
    expect(screen.getByText('No Teams Ranked Yet')).toBeInTheDocument();
    rerender(<MemoryRouter><TopTeams teams={[{ ...baseTeam, id: 't2', name: 'Aces' }]} /></MemoryRouter>);
    expect(screen.getByText('Top 10 Teams')).toBeInTheDocument();
  });

  it('verifies TeamOfTheWeekCard formatting with partial data', () => {
    const trend: WeeklyPowerScoreTrend = {
      teamId: 't1', teamName: 'Rockets', logoUrl: null, division: 'East', delta: 4.2, percentChange: 6.5, previousScore: 1234, currentScore: 1276,
    };
    render(<MemoryRouter><TeamOfTheWeekCard weekNumber={7} trend={trend} /></MemoryRouter>);
    expect(screen.getByText('+4.2')).toBeInTheDocument();
    expect(screen.getByText('+6.5%')).toBeInTheDocument();
  });

  it('verifies WeeklyRecapCard fallback behavior for partial data', () => {
    const { rerender } = render(<MemoryRouter><WeeklyRecapCard data={weeklyRecapBase} risers={[]} /></MemoryRouter>);
    expect(screen.queryByText('Weekly Recap')).not.toBeInTheDocument();
    rerender(<MemoryRouter><WeeklyRecapCard data={weeklyRecapBase} risers={[risingTrend]} /></MemoryRouter>);
    expect(screen.getByText('Movers')).toBeInTheDocument();
  });
});
