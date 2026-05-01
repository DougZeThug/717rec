import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { WeeklyRecapData } from '@/services/WeeklyRecapService';
import { Team } from '@/types';
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

vi.mock('../ScoreSubmissionModal', () => ({
  ScoreSubmissionModal: ({ open }: { open: boolean }) => (open ? <div>score-modal</div> : null),
}));
vi.mock('../TeamCard', () => ({
  default: ({ team }: { team: Pick<Team, 'name'> }) => <div>{team.name}</div>,
}));
vi.mock('../TeamCardCompact', () => ({
  default: ({ team }: { team: Pick<Team, 'name'> }) => <div>{team.name}</div>,
}));
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import PendingScoresCard from '../PendingScoresCard';
import TeamOfTheWeekCard from '../TeamOfTheWeekCard';
import TopTeams from '../TopTeams';
import WeeklyRecapCard from '../WeeklyRecapCard';

const baseTeam: Team = {
  id: 't1',
  name: 'Alpha',
  logoUrl: undefined,
  created_at: '2026-01-01T00:00:00.000Z',
};

const weeklyRecapBase: WeeklyRecapData = {
  weekNumber: 8,
  upsets: [],
  hotStreaks: [],
  hasData: false,
};

const risingTrend: WeeklyPowerScoreTrend = {
  teamId: 't9',
  teamName: 'Clutch',
  division: 'East',
  logoUrl: undefined,
  previousScore: 900,
  currentScore: 931,
  delta: 3.1,
  percentChange: 3.4,
  currentWeek: 8,
  previousWeek: 7,
};

describe('home dashboard cards', () => {
  it('covers PendingScoresCard loading, empty, and populated states', () => {
    pendingState = { isLoading: true, matches: [] };
    const { rerender } = render(
      <MemoryRouter>
        <PendingScoresCard />
      </MemoryRouter>
    );
    expect(screen.getByText('Matches awaiting score reports')).toBeInTheDocument();
    pendingState = { isLoading: false, matches: [] };
    rerender(
      <MemoryRouter>
        <PendingScoresCard />
      </MemoryRouter>
    );
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    pendingState = {
      isLoading: false,
      matches: [
        {
          id: 'p1',
          team1_name: 'Gamma',
          team2_name: 'Delta',
          team1_logo: null,
          team2_logo: null,
          date: '2026-02-14T18:00:00.000Z',
        },
      ],
    };
    rerender(
      <MemoryRouter>
        <PendingScoresCard />
      </MemoryRouter>
    );
    expect(screen.getByText('1 match awaiting score reports')).toBeInTheDocument();
  });
});

describe('leaderboard and highlight widgets', () => {
  it('verifies TopTeams fallback and populated formatting', () => {
    const { rerender } = render(
      <MemoryRouter>
        <TopTeams teams={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText('No Teams Ranked Yet')).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <TopTeams teams={[{ ...baseTeam, id: 't2', name: 'Aces' }]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Top 10 Teams')).toBeInTheDocument();
  });

  it('verifies TeamOfTheWeekCard formatting with partial data', () => {
    const trend: WeeklyPowerScoreTrend = {
      teamId: 't1',
      teamName: 'Rockets',
      logoUrl: null,
      division: 'East',
      delta: 4.2,
      percentChange: 6.5,
      previousScore: 1234,
      currentScore: 1276,

    };
    render(
      <MemoryRouter>
        <TeamOfTheWeekCard weekNumber={7} trend={trend} />
      </MemoryRouter>
    );
    expect(screen.getByText('+4.2')).toBeInTheDocument();
    expect(screen.getByText('+6.5%')).toBeInTheDocument();
  });

  it('verifies WeeklyRecapCard fallback behavior for partial data', () => {
    const { rerender } = render(
      <MemoryRouter>
        <WeeklyRecapCard data={weeklyRecapBase} risers={[]} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Weekly Recap')).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <WeeklyRecapCard data={weeklyRecapBase} risers={[risingTrend]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Movers')).toBeInTheDocument();
  });
});
