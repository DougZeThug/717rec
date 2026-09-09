import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Match } from '@/types';

const mockUseTheme = vi.hoisted(() => vi.fn());
const mockUseAdminAccess = vi.hoisted(() => vi.fn());
const mockUseMatchPrediction = vi.hoisted(() => vi.fn());
const mockUseCanScoreMatch = vi.hoisted(() => vi.fn());

vi.mock('next-themes', () => ({ useTheme: () => mockUseTheme() }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));
vi.mock('@/hooks/useMatchPrediction', () => ({
  useMatchPrediction: (params: unknown) => mockUseMatchPrediction(params),
}));
vi.mock('@/hooks/live-scoring/useCanScoreMatch', () => ({
  useCanScoreMatch: (match: unknown) => mockUseCanScoreMatch(match),
}));

vi.mock('@/components/matches', () => ({
  MatchInteractions: ({ matchId }: { matchId: string }) => (
    <div data-testid="match-interactions">interactions:{matchId}</div>
  ),
}));

vi.mock('@/components/transitions/TransitionLink', () => ({
  TransitionLink: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/components/schedule/MatchHeadToHead', () => ({
  MatchHeadToHead: () => <div data-testid="h2h">h2h</div>,
}));

vi.mock('@/components/schedule/MatchCountdown', () => ({
  default: ({ matchDate }: { matchDate: string }) => (
    <div data-testid="countdown">countdown:{matchDate}</div>
  ),
}));

vi.mock('@/components/schedule/MatchPrediction', () => ({
  MatchPrediction: () => <div data-testid="prediction">prediction</div>,
}));

vi.mock('@/components/live-scoring/MatchRecapDialog', () => ({
  MatchRecapDialog: ({ trigger }: { trigger: React.ReactNode }) => (
    <div data-testid="recap-dialog">{trigger}</div>
  ),
}));

import MatchCard from '../MatchCard';

const teamDetails = (team_id: string, name: string): NonNullable<Match['team1Details']> => ({
  team_id,
  name,
  image_url: `https://example.com/${team_id}.png`,
  logo_url: null,
  divisionName: 'Division A',
  division_id: 'div-1',
  power_score: 1500,
  sos: 0.5,
});

const baseMatch: Match = {
  id: 'match-1',
  team1Id: 't1',
  team2Id: 't2',
  date: '2026-08-01T18:00:00.000Z',
  team1Details: teamDetails('t1', 'Team Alpha'),
  team2Details: teamDetails('t2', 'Team Beta'),
};

const prediction = {
  probA: 0.7,
  probB: 0.3,
  favored: 'A' as const,
  confidence: 'medium' as const,
};

describe('MatchCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({ resolvedTheme: 'light' });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true });
    mockUseMatchPrediction.mockReturnValue({
      prediction,
      isUpsetResult: false,
      isLoading: false,
    });
    mockUseCanScoreMatch.mockReturnValue({ canScore: false, isAdmin: false, isLoading: false });
  });

  it('renders a completed match with team names, Final badge, game-win score and upset tag', () => {
    mockUseMatchPrediction.mockReturnValue({
      prediction,
      isUpsetResult: true,
      isLoading: false,
    });

    render(
      <MatchCard
        match={{
          ...baseMatch,
          iscompleted: true,
          winnerId: 't1',
          team1_game_wins: 3,
          team2_game_wins: 1,
        }}
      />
    );

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.getByText('Final')).toBeInTheDocument();
    // Game-win score renders from team*_game_wins for completed matches.
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    // isUpsetResult -> UpsetTag (rendered for real).
    expect(screen.getByText('Upset')).toBeInTheDocument();
    // Interactions render for completed matches by default.
    expect(screen.getByTestId('match-interactions')).toHaveTextContent('interactions:match-1');
  });

  it('marks the winner with a word, not colour alone', () => {
    const { rerender } = render(
      <MatchCard
        match={{
          ...baseMatch,
          iscompleted: true,
          winnerId: 't1',
          team1_game_wins: 3,
          team2_game_wins: 1,
        }}
      />
    );

    // Exactly one "Won" marker, and it sits beside the winning team's name.
    const wonTags = screen.getAllByText('Won');
    expect(wonTags).toHaveLength(1);
    expect(wonTags[0].parentElement).toHaveTextContent('Team Alpha');

    // An unfinished match marks nobody.
    rerender(<MatchCard match={{ ...baseMatch, iscompleted: false }} />);
    expect(screen.queryByText('Won')).not.toBeInTheDocument();
  });

  it('fires onEdit and onDelete for an upcoming match when admin access is granted', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const match: Match = { ...baseMatch, iscompleted: false };

    render(<MatchCard match={match} onEdit={onEdit} onDelete={onDelete} />);

    // Upcoming match shows countdown, not the Final badge.
    expect(screen.queryByText('Final')).not.toBeInTheDocument();
    expect(screen.getByTestId('countdown')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit match' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(match);

    fireEvent.click(screen.getByRole('button', { name: 'Delete match' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('match-1');
  });

  it('hides admin action buttons when admin access is not granted', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false });

    render(
      <MatchCard match={{ ...baseMatch, iscompleted: false }} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.queryByRole('button', { name: 'Edit match' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete match' })).not.toBeInTheDocument();
  });

  it('links authorized scorers to live scoring for upcoming matches', () => {
    mockUseCanScoreMatch.mockReturnValue({ canScore: true, isAdmin: false, isLoading: false });

    render(<MatchCard match={{ ...baseMatch, iscompleted: false }} />);

    // The TransitionLink test stub only forwards to/children, so the
    // accessible name is the visible text.
    const link = screen.getByRole('link', { name: 'Live score this match' });
    expect(link).toHaveAttribute('href', '/matches/match-1/live');
  });

  it('hides the live scoring link from users who cannot score', () => {
    render(<MatchCard match={{ ...baseMatch, iscompleted: false }} />);

    expect(screen.queryByText('Live score this match')).not.toBeInTheDocument();
  });

  it('hides the live scoring link for completed and postponed matches', () => {
    mockUseCanScoreMatch.mockReturnValue({ canScore: true, isAdmin: true, isLoading: false });

    const { rerender } = render(<MatchCard match={{ ...baseMatch, iscompleted: true }} />);
    expect(screen.queryByText('Live score this match')).not.toBeInTheDocument();

    rerender(<MatchCard match={{ ...baseMatch, status: 'postponed', iscompleted: false }} />);
    expect(screen.queryByText('Live score this match')).not.toBeInTheDocument();
  });

  // `iscompleted` is nullable. A null row used to fall out of both Schedule
  // tabs and be visible to nobody (UX audit X-13 / L1).
  it('treats a match with no recorded result as upcoming, not finished', () => {
    render(<MatchCard match={{ ...baseMatch, iscompleted: null }} />);

    expect(screen.queryByText('Final')).not.toBeInTheDocument();
    expect(screen.getByTestId('countdown')).toBeInTheDocument();
  });

  it('renders the postponed status badge for a postponed match', () => {
    render(<MatchCard match={{ ...baseMatch, status: 'postponed', iscompleted: false }} />);

    expect(screen.getByText('Postponed')).toBeInTheDocument();
    expect(screen.queryByText('Final')).not.toBeInTheDocument();
  });

  // Both exceptional states read their word from MATCH_STATUS_LABELS, so this
  // covers the second half of that map (UX audit X-13).
  it('renders the canceled status badge for a canceled match', () => {
    render(<MatchCard match={{ ...baseMatch, status: 'canceled', iscompleted: false }} />);

    expect(screen.getByText('Canceled')).toBeInTheDocument();
    expect(screen.queryByText('Postponed')).not.toBeInTheDocument();
  });

  it('shows "View match recap" trigger only when the match id is in liveScoredMatchIds', () => {
    const completed: Match = {
      ...baseMatch,
      iscompleted: true,
      team1_game_wins: 3,
      team2_game_wins: 1,
    };

    const { rerender } = render(<MatchCard match={completed} />);
    expect(screen.queryByText('View match recap')).not.toBeInTheDocument();

    rerender(<MatchCard match={completed} liveScoredMatchIds={new Set(['other-id'])} />);
    expect(screen.queryByText('View match recap')).not.toBeInTheDocument();

    rerender(<MatchCard match={completed} liveScoredMatchIds={new Set(['match-1'])} />);
    // Now rendered as a dialog trigger button, not a link.
    const trigger = screen.getByRole('button', { name: /view match recap/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view match recap/i })).not.toBeInTheDocument();
  });

  // A link may name one match — Home's "my match" row does. UX audit SC-04.
  it('carries an id a link can point at', () => {
    const { container } = render(<MatchCard match={baseMatch} />);

    expect(container.querySelector(`#match-${baseMatch.id}`)).not.toBeNull();
  });
});
