import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FinalStandings } from '../FinalStandings';

const mocks = vi.hoisted(() => ({
  fetchFinalStandings: vi.fn(),
}));

vi.mock('@/services/brackets/BracketReadService', () => ({
  fetchFinalStandings: mocks.fetchFinalStandings,
}));

const standings = [
  {
    placement: 1,
    wins: 3,
    losses: 0,
    game_wins: 6,
    game_losses: 1,
    teams: { id: 'team-1', name: 'Alpha Cornholers', logo_url: null, image_url: null },
  },
];

const renderStandings = (bracketId: string, show?: boolean) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <FinalStandings bracketId={bracketId} show={show} />
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('FinalStandings', () => {
  beforeEach(() => {
    mocks.fetchFinalStandings.mockResolvedValue(standings);
  });

  it('asks once for the standings of the bracket and shows them', async () => {
    renderStandings('bracket-1', true);

    expect(await screen.findByText('Alpha Cornholers')).toBeInTheDocument();
    expect(mocks.fetchFinalStandings).toHaveBeenCalledTimes(1);
    expect(mocks.fetchFinalStandings).toHaveBeenCalledWith('bracket-1');
  });

  it('shows the standings by default when show is not given', async () => {
    renderStandings('bracket-1');

    expect(await screen.findByText('Alpha Cornholers')).toBeInTheDocument();
    expect(mocks.fetchFinalStandings).toHaveBeenCalledWith('bracket-1');
  });

  it('shows nothing and asks for nothing when show is false', async () => {
    const { container } = renderStandings('bracket-1', false);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(mocks.fetchFinalStandings).not.toHaveBeenCalled();
  });

  it('asks for nothing while there is no bracket id', async () => {
    const { container } = renderStandings('', true);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(mocks.fetchFinalStandings).not.toHaveBeenCalled();
  });
});
