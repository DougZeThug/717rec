import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import HistoryPageContent from '../HistoryPageContent';

const mockUseHistoricalSeasons = vi.fn();
vi.mock('@/hooks/useSeasons', () => ({
  useHistoricalSeasons: () => mockUseHistoricalSeasons(),
}));
vi.mock('../SeasonAccordion', () => ({ default: () => <div>Seasons</div> }));
vi.mock('@/components/winter/WinterSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('HistoryPageContent when the seasons fail to load', () => {
  it('gives a safe reason and a way to try again', () => {
    const refetch = vi.fn();
    mockUseHistoricalSeasons.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('permission denied for table seasons'),
      refetch,
    });

    render(
      <MemoryRouter>
        <HistoryPageContent />
      </MemoryRouter>
    );

    expect(screen.getByText('Failed to load season history')).toBeInTheDocument();
    expect(screen.queryByText(/permission denied/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
  it('lists one accordion per season when they load', () => {
    mockUseHistoricalSeasons.mockReturnValue({
      data: [{ id: 's1' }, { id: 's2' }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <HistoryPageContent />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Seasons')).toHaveLength(2);
  });
});
