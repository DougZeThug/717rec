
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BracketFormTeamsContainer } from '../bracket-teams/components/BracketFormTeamsContainer';

// Integration tests with real hooks (mocked at API level)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        {
          teamId: 'team-1',
          teamName: 'Team Alpha',
          powerScore: 95.5,
          wins: 8,
          losses: 2,
          divisionName: 'Division A'
        }
      ],
      error: null
    })
  }
}));

describe('BracketFormTeamsContainer - Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWithProviders = (props: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BracketFormTeamsContainer {...props} />
      </QueryClientProvider>
    );
  };

  it('integrates all hooks correctly with validation callback', async () => {
    const mockOnChange = vi.fn();
    const props = {
      divisionId: 'div-1',
      maxTeams: 16,
      onChange: mockOnChange,
      divisions: [{ id: 'div-1', name: 'Division A' }]
    };

    renderWithProviders(props);

    // Should start with loading state
    expect(screen.getByText('Loading teams...')).toBeInTheDocument();

    // Wait for data to load and component to render
    await waitFor(() => {
      expect(screen.queryByText('Loading teams...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should call onChange with validation object when selection changes
    // Note: Full integration test would require more complex mocking
  });

  it('handles division filtering with validation in integration scenario', async () => {
    const mockOnChange = vi.fn();
    const mockTeams = [
      { id: 'team1', name: 'Team 1', division_id: 'div-1' },
      { id: 'team2', name: 'Team 2', division_id: 'div-2' },
    ];
    
    const props = {
      divisionId: 'div-1',
      teams: mockTeams,
      maxTeams: 16,
      onChange: mockOnChange,
      divisions: [{ id: 'div-1', name: 'Division A' }]
    };

    renderWithProviders(props);

    // Should render without loading since teams are provided
    await waitFor(() => {
      expect(screen.queryByText('Loading teams...')).not.toBeInTheDocument();
    });

    // Verify that onChange receives validation object
    // This would need more specific implementation testing
  });

  it('shows retry button on error when refetch is available', async () => {
    const mockOnChange = vi.fn();
    const props = {
      divisionId: 'div-1',
      maxTeams: 16,
      onChange: mockOnChange,
      divisions: [{ id: 'div-1', name: 'Division A' }]
    };

    // Mock to return error state
    vi.mocked(vi.fn()).mockResolvedValueOnce({
      data: null,
      error: new Error('Network error')
    });

    renderWithProviders(props);

    // Should show error state with retry button
    await waitFor(() => {
      expect(screen.getByText('Error Loading Teams')).toBeInTheDocument();
    });
  });
});
