
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TeamSelectionEmpty } from '../bracket-teams/components/TeamSelectionEmpty';

describe('TeamSelectionEmpty', () => {
  const defaultProps = {
    minTeams: 2,
    maxTeams: 16,
    message: 'No teams available',
    description: 'No teams found for the selected division.'
  };

  it('renders empty message', () => {
    render(<TeamSelectionEmpty {...defaultProps} />);
    
    expect(screen.getByText('No teams available')).toBeInTheDocument();
  });

  it('displays description', () => {
    render(<TeamSelectionEmpty {...defaultProps} />);
    
    expect(screen.getByText('No teams found for the selected division.')).toBeInTheDocument();
  });

  it('displays min and max teams in label', () => {
    render(<TeamSelectionEmpty {...defaultProps} />);
    
    expect(screen.getByText('Select Teams (Min 2, Max 16)')).toBeInTheDocument();
  });

  it('applies empty state styling', () => {
    render(<TeamSelectionEmpty {...defaultProps} />);
    
    const emptyCard = screen.getByText('No teams available');
    expect(emptyCard).toHaveClass('text-gray-500');
  });

  it('handles custom messages', () => {
    const customProps = {
      ...defaultProps,
      message: 'Custom empty message',
      description: 'Custom description'
    };

    render(<TeamSelectionEmpty {...customProps} />);
    
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });
});
