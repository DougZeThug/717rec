
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BracketFormTeams } from '../BracketFormTeams';

// Mock the container component
vi.mock('../bracket-teams/components', () => ({
  BracketFormTeamsContainer: ({ divisionId, maxTeams, onChange, divisions, minTeams }: any) => (
    <div data-testid="bracket-form-teams-container">
      <span data-testid="division-id">{divisionId || 'null'}</span>
      <span data-testid="max-teams">{maxTeams}</span>
      <span data-testid="min-teams">{minTeams}</span>
      <span data-testid="divisions-count">{divisions ? divisions.length : 0}</span>
      <button onClick={() => onChange(['team-1'])}>Mock Change</button>
    </div>
  )
}));

describe('BracketFormTeams - Simplified Wrapper', () => {
  const defaultProps = {
    divisionId: 'div-1',
    maxTeams: 16,
    onChange: vi.fn(),
    divisions: [
      { id: 'div-1', name: 'Division A' },
      { id: 'div-2', name: 'Division B' }
    ]
  };

  it('renders the container component', () => {
    render(<BracketFormTeams {...defaultProps} />);
    
    expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
  });

  it('passes all props to the container', () => {
    render(<BracketFormTeams {...defaultProps} />);
    
    expect(screen.getByTestId('division-id')).toHaveTextContent('div-1');
    expect(screen.getByTestId('max-teams')).toHaveTextContent('16');
    expect(screen.getByTestId('divisions-count')).toHaveTextContent('2');
  });

  it('sets minTeams to 2 by default', () => {
    render(<BracketFormTeams {...defaultProps} />);
    
    expect(screen.getByTestId('min-teams')).toHaveTextContent('2');
  });

  it('handles null divisionId', () => {
    render(<BracketFormTeams {...defaultProps} divisionId={null} />);
    
    expect(screen.getByTestId('division-id')).toHaveTextContent('null');
  });

  it('handles empty divisions array', () => {
    render(<BracketFormTeams {...defaultProps} divisions={[]} />);
    
    expect(screen.getByTestId('divisions-count')).toHaveTextContent('0');
  });

  it('forwards onChange events', async () => {
    const mockOnChange = vi.fn();
    render(<BracketFormTeams {...defaultProps} onChange={mockOnChange} />);
    
    const changeButton = screen.getByText('Mock Change');
    await userEvent.click(changeButton);
    
    expect(mockOnChange).toHaveBeenCalledWith(['team-1']);
  });

  describe('Backward Compatibility', () => {
    it('maintains the same public API', () => {
      // Test that all expected props are accepted without TypeScript errors
      const props = {
        divisionId: 'test-division' as string | null,
        maxTeams: 8,
        onChange: vi.fn(),
        divisions: [{ id: 'div-1', name: 'Division A' }]
      };
      
      expect(() => render(<BracketFormTeams {...props} />)).not.toThrow();
    });

    it('handles all prop variations', () => {
      const variations = [
        { divisionId: null, maxTeams: 16, onChange: vi.fn() },
        { divisionId: 'div-1', maxTeams: 8, onChange: vi.fn(), divisions: [] },
        { divisionId: 'div-2', maxTeams: 32, onChange: vi.fn(), divisions: undefined }
      ];

      variations.forEach((props, index) => {
        const { unmount } = render(<BracketFormTeams key={index} {...props} />);
        expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
        unmount();
      });
    });
  });
});
