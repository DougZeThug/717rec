
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

  it('integrates all hooks correctly in real scenario', async () => {
    const mockOnChange = vi.fn();
    const props = {
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
  });

  it('handles real user interaction flow', async () => {
    const mockOnChange = vi.fn();
    const props = {
      maxTeams: 16,
      onChange: mockOnChange,
      divisions: [{ id: 'div-1', name: 'Division A' }]
    };

    renderWithProviders(props);

    await waitFor(() => {
      expect(screen.queryByText('Loading teams...')).not.toBeInTheDocument();
    });

    // Should be able to interact with team selection
    // This would test the full integration without mocking individual hooks
  });
});
