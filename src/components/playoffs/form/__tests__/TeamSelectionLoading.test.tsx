
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TeamSelectionLoading } from '../bracket-teams/components/TeamSelectionLoading';

describe('TeamSelectionLoading', () => {
  const defaultProps = {
    minTeams: 2,
    maxTeams: 16
  };

  it('renders loading message', () => {
    render(<TeamSelectionLoading {...defaultProps} />);
    
    expect(screen.getByText('Loading teams...')).toBeInTheDocument();
  });

  it('displays min and max teams in label', () => {
    render(<TeamSelectionLoading {...defaultProps} />);
    
    expect(screen.getByText('Select Teams (Min 2, Max 16)')).toBeInTheDocument();
  });

  it('shows loading description', () => {
    render(<TeamSelectionLoading {...defaultProps} />);
    
    expect(screen.getByText(/Loading team rankings and division data/)).toBeInTheDocument();
  });

  it('applies loading styling', () => {
    render(<TeamSelectionLoading {...defaultProps} />);
    
    const loadingCard = screen.getByText('Loading teams...');
    expect(loadingCard).toHaveClass('text-gray-500');
  });
});
