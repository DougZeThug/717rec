import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { openRadixTrigger } from '@/test/radix';
import type { HeroCardTargetType } from '@/types/heroCard';

import { TargetEntitySelector, TargetTypeSelector } from '../TargetSelector';

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

const renderSelector = (targetType: HeroCardTargetType, onChange = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <TargetEntitySelector targetType={targetType} value="" onChange={onChange} />
    </QueryClientProvider>
  );
};

// jsdom has no pointer capture or scrollIntoView, and Radix Select uses both.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

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

  it('lists the loaded teams and passes the chosen team id to onChange', async () => {
    const onChange = vi.fn();
    renderSelector('team', onChange);
    await waitFor(() => expect(mocks.fetchTeamsForSelector).toHaveBeenCalledTimes(1));

    await openRadixTrigger(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Team One' }));

    expect(onChange).toHaveBeenCalledWith('team-1');
  });

  it('shows nothing and asks for nothing when the card has no target', async () => {
    const { container } = renderSelector('none');

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(mocks.fetchTeamsForSelector).not.toHaveBeenCalled();
    expect(mocks.fetchDivisionsForSelector).not.toHaveBeenCalled();
    expect(mocks.fetchSeasonsForSelector).not.toHaveBeenCalled();
  });
});

describe('TargetTypeSelector', () => {
  it('passes the chosen audience type to onChange', async () => {
    const onChange = vi.fn();
    render(<TargetTypeSelector value="team" onChange={onChange} />);

    await openRadixTrigger(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: /Highlight a Division/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('division');
  });
});
