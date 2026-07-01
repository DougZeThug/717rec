import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

import EmptyMatchList from '../EmptyMatchList';

describe('EmptyMatchList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search empty state with the term and no action buttons', () => {
    render(<EmptyMatchList searchTerm="dragons" isCompleted={false} />);

    expect(screen.getByText('No Matches Found')).toBeInTheDocument();
    expect(
      screen.getByText('No matches found for "dragons". Try a different search term.')
    ).toBeInTheDocument();
    // Search branch exposes no actions.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the completed empty state when there are no results and no search', () => {
    render(<EmptyMatchList searchTerm="" isCompleted />);

    expect(screen.getByText('No Completed Matches')).toBeInTheDocument();
    expect(screen.getByText(/Once matches are played and scores are recorded/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the upcoming empty state and navigates to /teams via the action', () => {
    render(<EmptyMatchList searchTerm="" isCompleted={false} />);

    expect(screen.getByText('No Upcoming Matches')).toBeInTheDocument();
    expect(
      screen.getByText('There are no scheduled matches yet. Check back later for updates.')
    ).toBeInTheDocument();

    const viewTeams = screen.getByRole('button', { name: 'View Teams' });
    fireEvent.click(viewTeams);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/teams');
  });
});
