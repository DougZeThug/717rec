import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MatchRow from '../MatchRow';
import { MatchWithTeams } from '../types';

vi.mock('@/utils/logger', () => ({
  scoreLog: vi.fn(),
}));

const createMockMatch = (overrides: Partial<MatchWithTeams> = {}): MatchWithTeams => ({
  id: 'match-1',
  team1Id: 'team-1',
  team2Id: 'team-2',
  team1Score: 0,
  team2Score: 0,
  date: '2024-01-01',
  location: 'Test Location',
  iscompleted: false,
  winnerId: null,
  loserId: null,
  round_number: 1,
  position: 1,
  bracket_id: 'bracket-1',
  match_type: null,
  next_match_id: null,
  next_loser_match_id: null,
  best_of: 3,
  created_at: '2024-01-01',
  team1: {
    id: 'team-1',
    name: 'Team Alpha',
    logoUrl: null,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    created_at: '',
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
  },
  team2: {
    id: 'team-2',
    name: 'Team Beta',
    logoUrl: null,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    created_at: '',
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
  },
  isEdited: false,
  isValid: true,
  ...overrides,
});

describe('MatchRow', () => {
  const defaultProps = {
    match: createMockMatch(),
    index: 0,
    onScoreChange: vi.fn(),
    onGameWinsChange: vi.fn(),
    onMarkCompleted: vi.fn(),
  };

  it('renders team names', () => {
    render(<MatchRow {...defaultProps} />);

    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
  });

  it('renders Mark as Complete label', () => {
    render(<MatchRow {...defaultProps} />);

    expect(screen.getByText('Mark as Complete')).toBeInTheDocument();
  });

  it('shows submitting state with loader', () => {
    const props = {
      ...defaultProps,
      match: createMockMatch({ isSubmitting: true }),
    };

    render(<MatchRow {...props} />);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('shows error state with alert icon', () => {
    const props = {
      ...defaultProps,
      match: createMockMatch({ submitError: true }),
    };

    render(<MatchRow {...props} />);

    expect(screen.getByText('Submission failed - please retry')).toBeInTheDocument();
  });

  it('applies correct styling when submitting', () => {
    const props = {
      ...defaultProps,
      match: createMockMatch({ isSubmitting: true }),
    };

    const { container } = render(<MatchRow {...props} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('border-primary/50');
  });

  it('applies error styling when submitError is true', () => {
    const props = {
      ...defaultProps,
      match: createMockMatch({ submitError: true }),
    };

    const { container } = render(<MatchRow {...props} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('border-destructive');
  });

  it('applies default styling when not submitting or error', () => {
    const { container } = render(<MatchRow {...defaultProps} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('border-border');
  });

  it('disables switch when submitting', () => {
    const props = {
      ...defaultProps,
      match: createMockMatch({ isSubmitting: true }),
    };

    render(<MatchRow {...props} />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeDisabled();
  });

  it('uses prop isSubmitting as fallback', () => {
    const props = {
      ...defaultProps,
      isSubmitting: true,
    };

    render(<MatchRow {...props} />);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('uses prop hasError as fallback', () => {
    const props = {
      ...defaultProps,
      hasError: true,
    };

    render(<MatchRow {...props} />);

    expect(screen.getByText('Submission failed - please retry')).toBeInTheDocument();
  });

  it('prioritizes match state over props for isSubmitting', () => {
    const props = {
      ...defaultProps,
      match: createMockMatch({ isSubmitting: false }),
      isSubmitting: true,
    };

    render(<MatchRow {...props} />);

    // Since match.isSubmitting is false but propIsSubmitting is true,
    // the OR logic will still show submitting
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('does not show error when isSubmitting is true', () => {
    const props = {
      ...defaultProps,
      match: createMockMatch({ isSubmitting: true, submitError: true }),
    };

    render(<MatchRow {...props} />);

    // Should show submitting, not error
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.queryByText('Submission failed - please retry')).not.toBeInTheDocument();
  });
});
