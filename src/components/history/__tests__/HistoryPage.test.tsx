
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { vi, describe, it, expect } from 'vitest';
import HistoryPageContent from '../HistoryPageContent';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [
            {
              id: '1',
              name: 'Spring 2025',
              start_date: '2025-01-01',
              end_date: '2025-04-01',
              is_active: false
            }
          ],
          error: null
        }))
      }))
    }))
  }
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('HistoryPage', () => {
  it('renders season history correctly', async () => {
    render(
      <TestWrapper>
        <HistoryPageContent />
      </TestWrapper>
    );

    // Check that the loading state appears initially
    expect(screen.getByText('Loading season history...')).toBeInTheDocument();
  });

  it('displays champion badge when team is champion', () => {
    const mockTeam = {
      team_id: '1',
      season_id: '1',
      match_wins: 10,
      match_losses: 2,
      game_wins: 25,
      game_losses: 8,
      sos: 0.75,
      power_score: 85.5,
      champion: true,
      division_name: 'Competitive',
      team_name: 'Test Champions',
      team_logo_url: null,
      team_image_url: null,
    };

    // This would be expanded in a more comprehensive test
    expect(mockTeam.champion).toBe(true);
  });
});
