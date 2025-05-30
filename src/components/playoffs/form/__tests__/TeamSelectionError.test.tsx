
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TeamSelectionError } from '../bracket-teams/components/TeamSelectionError';

describe('TeamSelectionError', () => {
  const defaultProps = {
    errorMessage: 'Failed to load teams',
    minTeams: 2,
    maxTeams: 16
  };

  it('renders error message', () => {
    render(<TeamSelectionError {...defaultProps} />);
    
    expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
  });

  it('displays min and max teams in label', () => {
    render(<TeamSelectionError {...defaultProps} />);
    
    expect(screen.getByText('Select Teams (Min 2, Max 16)')).toBeInTheDocument();
  });

  it('shows error description', () => {
    render(<TeamSelectionError {...defaultProps} />);
    
    expect(screen.getByText(/Error loading team data/)).toBeInTheDocument();
  });

  it('applies error styling', () => {
    render(<TeamSelectionError {...defaultProps} />);
    
    const errorCard = screen.getByText('Failed to load teams');
    expect(errorCard).toHaveClass('text-red-500', 'border-red-300');
  });
});
