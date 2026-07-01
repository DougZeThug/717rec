import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeadToHeadData } from '@/hooks/useBatchHeadToHead';

const mockUseMatchHeadToHead = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useMatchHeadToHead', () => ({
  useMatchHeadToHead: (team1Id: string | null, team2Id: string | null) =>
    mockUseMatchHeadToHead(team1Id, team2Id),
}));

import { MatchHeadToHead } from '../MatchHeadToHead';

const baseProps = {
  team1Id: 'team-1',
  team2Id: 'team-2',
  team1Name: 'Thunder Cats',
  team2Name: 'Storm Hawks',
};

const makeH2H = (overrides: Partial<HeadToHeadData> = {}): HeadToHeadData => ({
  team1Wins: 0,
  team2Wins: 0,
  totalMatches: 0,
  team1GameWins: 0,
  team2GameWins: 0,
  isFirstMeeting: false,
  ...overrides,
});

describe('MatchHeadToHead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMatchHeadToHead.mockReturnValue({ data: null, isLoading: false, isFirstMeeting: false });
  });

  it('renders the skeleton loading state while batch data is loading', () => {
    const { container } = render(<MatchHeadToHead {...baseProps} isBatchLoading />);

    // Skeleton uses the h-4 w-32 classes the component passes in.
    expect(container.querySelector('.h-4.w-32')).not.toBeNull();
    expect(screen.queryByText('H2H:')).not.toBeInTheDocument();
  });

  it('renders nothing when prefetched data is null', () => {
    const { container } = render(<MatchHeadToHead {...baseProps} prefetchedData={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the leading team, series score, and rivalry tag for a close series', () => {
    render(
      <MatchHeadToHead
        {...baseProps}
        prefetchedData={makeH2H({ team1Wins: 3, team2Wins: 2, totalMatches: 5 })}
      />
    );

    expect(screen.getByText('H2H:')).toBeInTheDocument();
    // team1 leads (3 > 2), so team1Name is highlighted.
    expect(screen.getByText('Thunder Cats')).toBeInTheDocument();
    expect(screen.getByText(/leads 3.2/)).toBeInTheDocument();
    // 3-2 over 5 games => close series => "Rivalry" tag.
    expect(screen.getByText('Rivalry')).toBeInTheDocument();
  });

  it('renders "First meeting" for first-meeting data with no rivalry tag', () => {
    render(
      <MatchHeadToHead
        {...baseProps}
        prefetchedData={makeH2H({ isFirstMeeting: true, totalMatches: 0 })}
      />
    );

    expect(screen.getByText('H2H:')).toBeInTheDocument();
    expect(screen.getByText('First meeting')).toBeInTheDocument();
    expect(screen.queryByText('Rivalry')).not.toBeInTheDocument();
  });

  it('updates the displayed H2H text when re-rendered with different data', () => {
    const { rerender } = render(
      <MatchHeadToHead
        {...baseProps}
        prefetchedData={makeH2H({ team1Wins: 3, team2Wins: 2, totalMatches: 5 })}
      />
    );

    expect(screen.getByText(/leads 3.2/)).toBeInTheDocument();

    rerender(
      <MatchHeadToHead
        {...baseProps}
        prefetchedData={makeH2H({ isFirstMeeting: true, totalMatches: 0 })}
      />
    );

    expect(screen.getByText('First meeting')).toBeInTheDocument();
    expect(screen.queryByText(/leads 3.2/)).not.toBeInTheDocument();
  });
});
