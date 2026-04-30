import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

let pendingState: any = { isLoading: false, matches: [] };
vi.mock('@/hooks/usePendingScoresMatches', () => ({
  usePendingScoresMatches: () => pendingState,
}));
vi.mock('@/hooks/useTeamBadges', () => ({ useAllTeamBadges: () => ({ data: [] }) }));

vi.mock('../MatchCard', () => ({ default: ({ match }: { match: { id: string } }) => <div>match-card-{match.id}</div> }));
vi.mock('../ScoreSubmissionModal', () => ({ ScoreSubmissionModal: ({ open }: { open: boolean }) => (open ? <div>score-modal</div> : null) }));
vi.mock('../TeamCard', () => ({ default: ({ team }: { team: { name: string } }) => <div>{team.name}</div> }));
vi.mock('../TeamCardCompact', () => ({ default: ({ team }: { team: { name: string } }) => <div>{team.name}</div> }));
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import MyNextMatchCard from '../MyNextMatchCard';
import PendingScoresCard from '../PendingScoresCard';
import RecentMatches from '../RecentMatches';
import TopTeams from '../TopTeams';
import TeamOfTheWeekCard from '../TeamOfTheWeekCard';
import WeeklyRecapCard from '../WeeklyRecapCard';

const baseMatch = { id: 'm1', team1Id: 't1', team2Id: 't2', date: '2026-02-14T18:00:00.000Z', team1_game_wins: 2, team2_game_wins: 1 } as any;

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
    pendingState = { isLoading: false, matches: [{ id: 'p1', team1_name: 'Gamma', team2_name: 'Delta', team1_logo: null, team2_logo: null, date: '2026-02-14T18:00:00.000Z' }] };
    rerender(<MemoryRouter><PendingScoresCard /></MemoryRouter>);
    expect(screen.getByText('1 match awaiting score reports')).toBeInTheDocument();
  });

  it('covers RecentMatches loading, empty, and normal states', () => {
    const getTeamById = (id: string) => ({ id, name: id }) as any;
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
    rerender(<MemoryRouter><TopTeams teams={[{ id: 't1', name: 'Aces' } as any]} /></MemoryRouter>);
    expect(screen.getByText('Top 10 Teams')).toBeInTheDocument();
  });

  it('verifies TeamOfTheWeekCard formatting with partial data', () => {
    render(<MemoryRouter><TeamOfTheWeekCard weekNumber={7} trend={{ teamId: 't1', teamName: 'Rockets', logoUrl: null, division: 'East', delta: 4.2, percentChange: 6.5, previousScore: 1234, currentScore: 1276 } as any} /></MemoryRouter>);
    expect(screen.getByText('+4.2')).toBeInTheDocument();
    expect(screen.getByText('+6.5%')).toBeInTheDocument();
  });

  it('verifies WeeklyRecapCard fallback behavior for partial data', () => {
    const { rerender } = render(<MemoryRouter><WeeklyRecapCard data={{ weekNumber: 8, upsets: [], hotStreaks: [] } as any} risers={[]} /></MemoryRouter>);
    expect(screen.queryByText('Weekly Recap')).not.toBeInTheDocument();
    rerender(<MemoryRouter><WeeklyRecapCard data={{ weekNumber: 8, upsets: [], hotStreaks: [] } as any} risers={[{ teamId: 't9', teamName: 'Clutch', delta: 3.1, previousScore: 900, currentScore: 931 } as any]} /></MemoryRouter>);
    expect(screen.getByText('Movers')).toBeInTheDocument();
  });
});
