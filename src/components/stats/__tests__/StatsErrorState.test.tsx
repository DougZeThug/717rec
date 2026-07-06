import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import StatsErrorState from '../StatsErrorState';

describe('StatsErrorState', () => {
  it('renders the generic error message', () => {
    render(<StatsErrorState teamsError={null} matchesError={null} />);
    expect(screen.getByText(/error loading the statistics data/i)).toBeInTheDocument();
  });

  it('shows the teams error message when present', () => {
    render(<StatsErrorState teamsError={new Error('Failed to fetch teams')} matchesError={null} />);
    expect(screen.getByText('Failed to fetch teams')).toBeInTheDocument();
  });

  it('shows the matches error message when present', () => {
    render(
      <StatsErrorState teamsError={null} matchesError={new Error('Failed to fetch matches')} />
    );
    expect(screen.getByText('Failed to fetch matches')).toBeInTheDocument();
  });

  it('shows both error messages when both are present', () => {
    render(
      <StatsErrorState
        teamsError={new Error('teams broke')}
        matchesError={new Error('matches broke')}
      />
    );
    expect(screen.getByText('teams broke')).toBeInTheDocument();
    expect(screen.getByText('matches broke')).toBeInTheDocument();
  });
});
