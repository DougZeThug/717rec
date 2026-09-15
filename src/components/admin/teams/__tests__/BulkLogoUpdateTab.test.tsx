import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseTeamsQuery = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/teams', () => ({ useTeamsQuery: () => mockUseTeamsQuery() }));
vi.mock('../TeamLogoCard', () => ({
  default: ({ team }: { team: { name: string } }) => <div>{team.name}</div>,
}));

import BulkLogoUpdateTab from '../BulkLogoUpdateTab';

const teams = [
  { id: '1', name: 'Alpha', imageUrl: 'https://example.test/a.webp' },
  { id: '2', name: 'Bravo', imageUrl: null },
];

describe('BulkLogoUpdateTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamsQuery.mockReturnValue({
      data: teams,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('lists the teams once they arrive', () => {
    render(<BulkLogoUpdateTab />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  /**
   * A failed fetch leaves `isLoading` false with no data, so an
   * `isLoading`-only guard fell through to an empty list under four zeroed
   * counts — which reads as "every logo is already sorted".
   */
  it('says so when the teams cannot be loaded, and offers a retry', async () => {
    const refetch = vi.fn();
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network down'),
      refetch,
    });
    const user = userEvent.setup();
    render(<BulkLogoUpdateTab />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't load the teams. Please try again."
    );
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('keeps the list when a refetch fails but the teams are already loaded', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: teams,
      isLoading: false,
      error: new Error('refetch failed'),
      refetch: vi.fn(),
    });
    render(<BulkLogoUpdateTab />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('shows the spinner, not the error, while the first fetch is running', () => {
    mockUseTeamsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<BulkLogoUpdateTab />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
});
