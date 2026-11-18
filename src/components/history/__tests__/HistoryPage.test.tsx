import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

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
              is_active: false,
            },
          ],
          error: null,
        })),
      })),
    })),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('HistoryPage', () => {
  it('renders season history correctly', () => {
    render(
      <TestWrapper>
        <HistoryPageContent />
      </TestWrapper>
    );

    // Check that the loading state appears initially
    expect(screen.getByText('Loading historical data...')).toBeInTheDocument();
  });
});
