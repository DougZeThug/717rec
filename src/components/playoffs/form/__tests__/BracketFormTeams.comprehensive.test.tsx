
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BracketFormTeamsContainer } from '../bracket-teams/components/BracketFormTeamsContainer';
import type { BracketFormTeamsContainerProps } from '../bracket-teams/types';

// Enhanced mock for the container component
const mockContainerComponent = vi.fn();

vi.mock('../bracket-teams/components/TeamSelectionForm', () => ({
  TeamSelectionForm: (props: any) => mockContainerComponent(props)
}));

describe('BracketFormTeamsContainer - Comprehensive Tests', () => {
  // Test Data Factories - Fixed to match interface
  const createBasicProps = (): BracketFormTeamsContainerProps => ({
    maxTeams: 16,
    onChange: vi.fn(),
    divisions: [
      { id: 'div-1', name: 'Division A' },
      { id: 'div-2', name: 'Division B' }
    ]
  });

  const createEdgeCaseProps = () => ({
    maxTeams: 0,
    onChange: vi.fn(),
    divisions: []
  });

  const createLargeDatasetProps = () => ({
    maxTeams: 64,
    onChange: vi.fn(),
    divisions: Array.from({ length: 50 }, (_, i) => ({
      id: `div-${i}`,
      name: `Division ${i}`
    }))
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockContainerComponent.mockImplementation((props) => (
      <div data-testid="bracket-form-teams-container">
        <span data-testid="max-teams">{props.maxTeams}</span>
        <span data-testid="min-teams">{props.minTeams}</span>
        <span data-testid="divisions-count">{props.divisions ? props.divisions.length : 0}</span>
        <button onClick={() => props.onChange(['team-1'])}>Mock Change</button>
      </div>
    ));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Prop Forwarding Tests', () => {
    it('forwards all required props to container', () => {
      const props = createBasicProps();
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
    });

    it('forwards onChange callback correctly', async () => {
      const mockOnChange = vi.fn();
      const props = { ...createBasicProps(), onChange: mockOnChange };
      
      render(<BracketFormTeamsContainer {...props} />);
      
      const changeButton = screen.getByText('Mock Change');
      await userEvent.click(changeButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(['team-1']);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('forwards complex division data structures', () => {
      const complexDivisions = [
        { id: 'div-1', name: 'Division A' },
        { id: 'div-2', name: 'Division B with Special Characters !@#$%' },
        { id: 'div-3', name: '' }, // Edge case: empty name
      ];
      
      const props = { ...createBasicProps(), divisions: complexDivisions };
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('divisions-count')).toHaveTextContent('3');
    });
  });

  describe('Default Values Tests', () => {
    it('sets minTeams to 2 by default', () => {
      const props = createBasicProps();
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('min-teams')).toHaveTextContent('2');
    });

    it('maintains minTeams default across re-renders', () => {
      const props = createBasicProps();
      const { rerender } = render(<BracketFormTeamsContainer {...props} />);
      
      // Re-render with different props
      rerender(<BracketFormTeamsContainer {...props} maxTeams={32} />);
      
      expect(screen.getByTestId('min-teams')).toHaveTextContent('2');
    });
  });

  describe('Edge Cases Tests', () => {
    it('handles empty divisions array', () => {
      const props = { ...createBasicProps(), divisions: [] };
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('divisions-count')).toHaveTextContent('0');
    });

    it('handles undefined divisions', () => {
      const props = { ...createBasicProps(), divisions: undefined };
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('divisions-count')).toHaveTextContent('0');
    });

    it('handles zero maxTeams', () => {
      const props = { ...createBasicProps(), maxTeams: 0 };
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('max-teams')).toHaveTextContent('0');
    });

    it('handles large maxTeams values', () => {
      const props = { ...createBasicProps(), maxTeams: 1024 };
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('max-teams')).toHaveTextContent('1024');
    });
  });

  describe('Component Lifecycle Tests', () => {
    it('renders container component on mount', () => {
      const props = createBasicProps();
      render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
    });

    it('cleans up properly on unmount', () => {
      const props = createBasicProps();
      const { unmount } = render(<BracketFormTeamsContainer {...props} />);
      
      expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
      
      unmount();
      
      expect(screen.queryByTestId('bracket-form-teams-container')).not.toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('handles large datasets efficiently', () => {
      const props = createLargeDatasetProps();
      
      const startTime = performance.now();
      render(<BracketFormTeamsContainer {...props} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms for large dataset)
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByTestId('divisions-count')).toHaveTextContent('50');
    });
  });
});
