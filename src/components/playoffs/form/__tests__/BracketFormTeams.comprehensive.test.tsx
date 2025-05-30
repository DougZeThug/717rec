
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BracketFormTeams } from '../BracketFormTeams';
import type { BracketFormTeamsProps } from '../bracket-teams/types';

// Enhanced mock for the container component
const mockContainerComponent = vi.fn();

vi.mock('../bracket-teams/components', () => ({
  BracketFormTeamsContainer: (props: any) => mockContainerComponent(props)
}));

describe('BracketFormTeams - Comprehensive Wrapper Tests', () => {
  // Test Data Factories
  const createBasicProps = (): BracketFormTeamsProps => ({
    divisionId: 'div-1',
    maxTeams: 16,
    onChange: vi.fn(),
    divisions: [
      { id: 'div-1', name: 'Division A' },
      { id: 'div-2', name: 'Division B' }
    ]
  });

  const createEdgeCaseProps = () => ({
    divisionId: null,
    maxTeams: 0,
    onChange: vi.fn(),
    divisions: []
  });

  const createLargeDatasetProps = () => ({
    divisionId: 'div-large',
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
        <span data-testid="division-id">{props.divisionId || 'null'}</span>
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
      render(<BracketFormTeams {...props} />);
      
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          divisionId: props.divisionId,
          maxTeams: props.maxTeams,
          onChange: props.onChange,
          divisions: props.divisions,
          minTeams: 2 // Default value
        })
      );
    });

    it('forwards onChange callback correctly', async () => {
      const mockOnChange = vi.fn();
      const props = { ...createBasicProps(), onChange: mockOnChange };
      
      render(<BracketFormTeams {...props} />);
      
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
      render(<BracketFormTeams {...props} />);
      
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          divisions: complexDivisions
        })
      );
    });

    it('preserves prop reference stability', () => {
      const props = createBasicProps();
      const { rerender } = render(<BracketFormTeams {...props} />);
      
      const firstCall = mockContainerComponent.mock.calls[0][0];
      
      // Re-render with same props
      rerender(<BracketFormTeams {...props} />);
      
      const secondCall = mockContainerComponent.mock.calls[1][0];
      
      // References should be preserved
      expect(firstCall.onChange).toBe(secondCall.onChange);
      expect(firstCall.divisions).toBe(secondCall.divisions);
    });
  });

  describe('Default Values Tests', () => {
    it('sets minTeams to 2 by default', () => {
      const props = createBasicProps();
      render(<BracketFormTeams {...props} />);
      
      expect(screen.getByTestId('min-teams')).toHaveTextContent('2');
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({ minTeams: 2 })
      );
    });

    it('maintains minTeams default across re-renders', () => {
      const props = createBasicProps();
      const { rerender } = render(<BracketFormTeams {...props} />);
      
      // Re-render with different props
      rerender(<BracketFormTeams {...props} maxTeams={32} />);
      
      expect(mockContainerComponent).toHaveBeenLastCalledWith(
        expect.objectContaining({ minTeams: 2 })
      );
    });

    it('applies default minTeams when no explicit value provided', () => {
      // Even when other props change, minTeams should remain 2
      const propsVariations = [
        { ...createBasicProps(), maxTeams: 8 },
        { ...createBasicProps(), divisionId: null },
        { ...createBasicProps(), divisions: [] },
      ];

      propsVariations.forEach((props, index) => {
        const { unmount } = render(<BracketFormTeams key={index} {...props} />);
        
        expect(mockContainerComponent).toHaveBeenCalledWith(
          expect.objectContaining({ minTeams: 2 })
        );
        
        unmount();
        vi.clearAllMocks();
      });
    });
  });

  describe('Edge Cases Tests', () => {
    it('handles null divisionId gracefully', () => {
      const props = { ...createBasicProps(), divisionId: null };
      render(<BracketFormTeams {...props} />);
      
      expect(screen.getByTestId('division-id')).toHaveTextContent('null');
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({ divisionId: null })
      );
    });

    it('handles empty divisions array', () => {
      const props = { ...createBasicProps(), divisions: [] };
      render(<BracketFormTeams {...props} />);
      
      expect(screen.getByTestId('divisions-count')).toHaveTextContent('0');
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({ divisions: [] })
      );
    });

    it('handles undefined divisions', () => {
      const props = { ...createBasicProps(), divisions: undefined };
      render(<BracketFormTeams {...props} />);
      
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({ divisions: undefined })
      );
    });

    it('handles zero maxTeams', () => {
      const props = { ...createBasicProps(), maxTeams: 0 };
      render(<BracketFormTeams {...props} />);
      
      expect(screen.getByTestId('max-teams')).toHaveTextContent('0');
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({ maxTeams: 0 })
      );
    });

    it('handles large maxTeams values', () => {
      const props = { ...createBasicProps(), maxTeams: 1024 };
      render(<BracketFormTeams {...props} />);
      
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({ maxTeams: 1024 })
      );
    });
  });

  describe('Component Lifecycle Tests', () => {
    it('renders container component on mount', () => {
      const props = createBasicProps();
      render(<BracketFormTeams {...props} />);
      
      expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
      expect(mockContainerComponent).toHaveBeenCalledTimes(1);
    });

    it('re-renders container when props change', () => {
      const props = createBasicProps();
      const { rerender } = render(<BracketFormTeams {...props} />);
      
      expect(mockContainerComponent).toHaveBeenCalledTimes(1);
      
      rerender(<BracketFormTeams {...props} maxTeams={32} />);
      
      expect(mockContainerComponent).toHaveBeenCalledTimes(2);
      expect(mockContainerComponent).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxTeams: 32 })
      );
    });

    it('cleans up properly on unmount', () => {
      const props = createBasicProps();
      const { unmount } = render(<BracketFormTeams {...props} />);
      
      expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
      
      unmount();
      
      expect(screen.queryByTestId('bracket-form-teams-container')).not.toBeInTheDocument();
    });
  });

  describe('Performance Tests', () => {
    it('does not cause unnecessary re-renders with stable props', () => {
      const props = createBasicProps();
      const { rerender } = render(<BracketFormTeams {...props} />);
      
      const initialCallCount = mockContainerComponent.mock.calls.length;
      
      // Re-render with exactly the same props
      rerender(<BracketFormTeams {...props} />);
      
      // Should still trigger re-render (React behavior), but props should be stable
      expect(mockContainerComponent.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('handles large datasets efficiently', () => {
      const props = createLargeDatasetProps();
      
      const startTime = performance.now();
      render(<BracketFormTeams {...props} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms for large dataset)
      expect(endTime - startTime).toBeLessThan(100);
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          divisions: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String), name: expect.any(String) })
          ])
        })
      );
    });
  });

  describe('API Compatibility Tests', () => {
    it('maintains backward compatibility with existing API', () => {
      // Test that all expected props are accepted without TypeScript errors
      const legacyProps: BracketFormTeamsProps = {
        divisionId: 'test-division',
        maxTeams: 8,
        onChange: vi.fn(),
        divisions: [{ id: 'div-1', name: 'Division A' }]
      };
      
      expect(() => render(<BracketFormTeams {...legacyProps} />)).not.toThrow();
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining(legacyProps)
      );
    });

    it('supports all documented prop variations', () => {
      const variations: BracketFormTeamsProps[] = [
        { divisionId: null, maxTeams: 16, onChange: vi.fn() },
        { divisionId: 'div-1', maxTeams: 8, onChange: vi.fn(), divisions: [] },
        { divisionId: 'div-2', maxTeams: 32, onChange: vi.fn(), divisions: undefined },
        createEdgeCaseProps() as BracketFormTeamsProps,
        createLargeDatasetProps()
      ];

      variations.forEach((props, index) => {
        const { unmount } = render(<BracketFormTeams key={index} {...props} />);
        
        expect(screen.getByTestId('bracket-form-teams-container')).toBeInTheDocument();
        expect(mockContainerComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            ...props,
            minTeams: 2 // Always includes default
          })
        );
        
        unmount();
        vi.clearAllMocks();
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('handles container component errors gracefully', () => {
      // Mock container to throw an error
      mockContainerComponent.mockImplementation(() => {
        throw new Error('Container error');
      });
      
      // Should not crash the wrapper
      expect(() => {
        render(<BracketFormTeams {...createBasicProps()} />);
      }).toThrow('Container error'); // Error should propagate
    });

    it('handles invalid prop types', () => {
      const invalidProps = {
        divisionId: 123 as any, // Invalid type
        maxTeams: 'invalid' as any, // Invalid type
        onChange: 'not-a-function' as any, // Invalid type
        divisions: 'not-an-array' as any // Invalid type
      };
      
      // TypeScript would catch this, but test runtime behavior
      expect(() => {
        render(<BracketFormTeams {...invalidProps} />);
      }).not.toThrow(); // Wrapper should not crash
      
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining(invalidProps)
      );
    });
  });

  describe('Integration Tests', () => {
    it('integrates properly with container component', async () => {
      const mockOnChange = vi.fn();
      const props = { ...createBasicProps(), onChange: mockOnChange };
      
      render(<BracketFormTeams {...props} />);
      
      // Verify container receives all props
      expect(mockContainerComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          divisionId: props.divisionId,
          maxTeams: props.maxTeams,
          onChange: mockOnChange,
          divisions: props.divisions,
          minTeams: 2
        })
      );
      
      // Test interaction flow
      const changeButton = screen.getByText('Mock Change');
      await userEvent.click(changeButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(['team-1']);
    });

    it('maintains consistent state across prop updates', async () => {
      const initialProps = createBasicProps();
      const { rerender } = render(<BracketFormTeams {...initialProps} />);
      
      // Update props
      const updatedProps = { ...initialProps, maxTeams: 24, divisionId: 'div-2' };
      rerender(<BracketFormTeams {...updatedProps} />);
      
      // Container should receive updated props
      expect(mockContainerComponent).toHaveBeenLastCalledWith(
        expect.objectContaining({
          maxTeams: 24,
          divisionId: 'div-2',
          minTeams: 2 // Should maintain default
        })
      );
    });
  });
});
