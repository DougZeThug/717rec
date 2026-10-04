import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCard } from '@/types/heroCard';

const mocks = vi.hoisted(() => ({
  fetchChampionTeams: vi.fn(),
  shouldApplyWinter: false,
}));

vi.mock('@/services/HeroCardService', () => ({
  HeroCardService: { fetchChampionTeams: mocks.fetchChampionTeams },
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinter: mocks.shouldApplyWinter }),
}));

// Embla needs browser APIs jsdom does not have; plain wrappers are enough here.
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CarouselItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import ChampionsHeroCard from '../ChampionsHeroCard';

const makeCard = (champions: Record<string, string> | null): HeroCard =>
  ({
    id: 'card-1',
    title: '🏆 Season Champions',
    card_type: 'champions',
    metadata: champions ? { champions } : {},
  }) as unknown as HeroCard;

const renderCard = (card: HeroCard) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChampionsHeroCard card={card} />
    </QueryClientProvider>
  );
};

describe('ChampionsHeroCard', () => {
  beforeEach(() => {
    mocks.fetchChampionTeams.mockReset();
    mocks.shouldApplyWinter = false;
  });

  it('shows a loading placeholder while the champion teams load', () => {
    mocks.fetchChampionTeams.mockImplementation(() => new Promise(() => undefined));
    const { container } = renderCard(makeCard({ Competitive: 't1' }));

    expect(container.querySelector('section.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('Season Champions')).not.toBeInTheDocument();
  });

  it('says the champions could not load when the fetch fails', async () => {
    mocks.fetchChampionTeams.mockImplementation(() => Promise.reject(new Error('boom')));
    renderCard(makeCard({ Competitive: 't1' }));

    expect(await screen.findByText(/Champions - Error Loading/)).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load champions. Please try again later.')
    ).toBeInTheDocument();
  });

  it('says the champions could not load when the card has no champions at all', () => {
    renderCard(makeCard(null));

    expect(screen.getByText(/Champions - Error Loading/)).toBeInTheDocument();
    expect(mocks.fetchChampionTeams).not.toHaveBeenCalled();
  });

  it('lists each champion under its division, strongest division first', async () => {
    mocks.fetchChampionTeams.mockImplementation(() =>
      Promise.resolve([
        { id: 't1', name: 'Bag Boys', image_url: null },
        { id: 't2', name: 'Hole Punchers', image_url: 'https://example.com/logo.png' },
        { id: 't3', name: 'Sandbaggers', image_url: null },
      ])
    );
    renderCard(makeCard({ Recreational: 't3', Competitive: 't1', Intermediate: 't2' }));

    expect(await screen.findByText('Season Champions')).toBeInTheDocument();
    // Each team shows in the phone carousel and in the desktop grid.
    expect(screen.getAllByText('Bag Boys')).toHaveLength(2);
    expect(screen.getAllByText('Hole Punchers')).toHaveLength(2);
    expect(screen.getAllByText('Sandbaggers')).toHaveLength(2);

    const divisions = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(divisions).toEqual(['Competitive', 'Intermediate', 'Recreational']);
  });

  it('skips a division whose team was not returned', async () => {
    mocks.fetchChampionTeams.mockImplementation(() =>
      Promise.resolve([{ id: 't1', name: 'Bag Boys', image_url: null }])
    );
    renderCard(makeCard({ Competitive: 't1', Intermediate: 'gone' }));

    expect(await screen.findByText('Season Champions')).toBeInTheDocument();
    expect(screen.queryByText('Intermediate')).not.toBeInTheDocument();
  });

  it('uses the winter colours on the loaded card when the winter theme is on', async () => {
    mocks.shouldApplyWinter = true;
    mocks.fetchChampionTeams.mockImplementation(() =>
      Promise.resolve([{ id: 't1', name: 'Bag Boys', image_url: null }])
    );
    renderCard(makeCard({ Competitive: 't1' }));

    expect(await screen.findByText('Season Champions')).toHaveClass('text-amber-50');
  });
});
