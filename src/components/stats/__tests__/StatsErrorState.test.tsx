import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BusinessLogicError } from '@/types/errors';

import StatsErrorState from '../StatsErrorState';

describe('StatsErrorState', () => {
  it('renders the generic error message', () => {
    render(<StatsErrorState teamsError={null} matchesError={null} />);
    expect(screen.getByText(/error loading the statistics data/i)).toBeInTheDocument();
  });

  it('gives a plain reason, not the raw error text, when the teams request failed', () => {
    render(<StatsErrorState teamsError={new Error('Failed to fetch teams')} matchesError={null} />);
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch teams')).not.toBeInTheDocument();
  });

  it('gives a plain reason when the matches request failed', () => {
    render(
      <StatsErrorState teamsError={null} matchesError={new Error('Failed to fetch matches')} />
    );
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch matches')).not.toBeInTheDocument();
  });

  it('still shows an authored reason from a typed error', () => {
    render(
      <StatsErrorState
        teamsError={new BusinessLogicError('The season has not started yet')}
        matchesError={null}
      />
    );
    expect(screen.getByText('The season has not started yet')).toBeInTheDocument();
  });

  it('shows one reason, not two, when both requests failed', () => {
    render(
      <StatsErrorState
        teamsError={new Error('teams broke')}
        matchesError={new Error('matches broke')}
      />
    );
    expect(screen.getAllByText('Something went wrong. Please try again.')).toHaveLength(1);
  });

  it('shows a retry button when onRetry is provided and calls it when clicked', () => {
    const onRetry = vi.fn();
    render(
      <StatsErrorState
        teamsError={new Error('teams broke')}
        matchesError={null}
        onRetry={onRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show a retry button when onRetry is not provided', () => {
    render(<StatsErrorState teamsError={new Error('teams broke')} matchesError={null} />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
