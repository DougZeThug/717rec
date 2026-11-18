import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCardTargetType } from '@/types/heroCard';

import { TargetEntitySelector } from '../TargetSelector';

const mocks = vi.hoisted(() => ({
  fetchTeamsForSelector: vi.fn(),
  fetchDivisionsForSelector: vi.fn(),
  fetchSeasonsForSelector: vi.fn(),
}));

vi.mock('@/services/selectors/SelectorService', () => ({
  fetchTeamsForSelector: mocks.fetchTeamsForSelector,
  fetchDivisionsForSelector: mocks.fetchDivisionsForSelector,
  fetchSeasonsForSelector: mocks.fetchSeasonsForSelector,
}));

const renderSelector = (targetType: HeroCardTargetType) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <TargetEntitySelector targetType={targetType} value="" onChange={vi.fn()} />
    </QueryClientProvider>
  );
};

// The picker is closed in every test below. Opening a Radix Select needs
// pointer capture, which jsdom does not have, and the lists are not the point:
// the point is that only the list for the chosen audience is asked for.
describe('TargetEntitySelector', () => {
  beforeEach(() => {
    mocks.fetchTeamsForSelector.mockResolvedValue([{ id: 'team-1', name: 'Team One' }]);
    mocks.fetchDivisionsForSelector.mockResolvedValue([{ id: 'div-1', name: 'Division One' }]);
    mocks.fetchSeasonsForSelector.mockResolvedValue([{ id: 'season-1', name: 'Season One' }]);
  });

  it('asks only for teams when the card targets a team', async () => {
    renderSelector('team');

    expect(screen.getByText('Select Team')).toBeInTheDocument();
    await waitFor(() => expect(mocks.fetchTeamsForSelector).toHaveBeenCalledTimes(1));
    expect(mocks.fetchDivisionsForSelector).not.toHaveBeenCalled();
    expect(mocks.fetchSeasonsForSelector).not.toHaveBeenCalled();
  });

  it('asks only for divisions when the card targets a division', async () => {
    renderSelector('division');

    expect(screen.getByText('Select Division')).toBeInTheDocument();
    await waitFor(() => expect(mocks.fetchDivisionsForSelector).toHaveBeenCalledTimes(1));
    expect(mocks.fetchTeamsForSelector).not.toHaveBeenCalled();
    expect(mocks.fetchSeasonsForSelector).not.toHaveBeenCalled();
  });

  it('asks only for seasons when the card targets a season', async () => {
    renderSelector('season');

    expect(screen.getByText('Select Season')).toBeInTheDocument();
    await waitFor(() => expect(mocks.fetchSeasonsForSelector).toHaveBeenCalledTimes(1));
    expect(mocks.fetchTeamsForSelector).not.toHaveBeenCalled();
    expect(mocks.fetchDivisionsForSelector).not.toHaveBeenCalled();
  });

  it('shows nothing and asks for nothing when the card has no target', async () => {
    const { container } = renderSelector('none');

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(mocks.fetchTeamsForSelector).not.toHaveBeenCalled();
    expect(mocks.fetchDivisionsForSelector).not.toHaveBeenCalled();
    expect(mocks.fetchSeasonsForSelector).not.toHaveBeenCalled();
  });
});
