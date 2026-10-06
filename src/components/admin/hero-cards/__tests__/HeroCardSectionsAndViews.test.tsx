import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeroCard, HeroCardFormData } from '@/types/heroCard';

import {
  AdvancedSettingsSection,
  CallToActionSection,
  CardBasicsSection,
  ChampionsEditor,
  EventWinnersEditor,
  HeroCardPreview,
  TargetingDisplaySection,
} from '../form-sections';
import HeroCardsTab from '../HeroCardsTab';

beforeAll(() => {
  function ResizeObserverCtor(this: {
    observe: () => undefined;
    unobserve: () => undefined;
    disconnect: () => undefined;
  }) {
    this.observe = () => undefined;
    this.unobserve = () => undefined;
    this.disconnect = () => undefined;
  }
  globalThis.ResizeObserver = ResizeObserverCtor as unknown as typeof ResizeObserver;
});

const baseForm: HeroCardFormData = {
  slug: 's',
  title: 't',
  subtitle: '',
  body: '',
  cta_label: '',
  cta_url: '',
  background_color: 'bg-gradient-to-r from-blue-600 to-amber-500',
  text_color: 'text-white',
  accent_color: '',
  image_url: '',
  icon_name: '',
  is_visible: false,
  sort_order: 0,
  target_type: 'none',
  target_id: '',
  card_type: 'standard',
  metadata: '{}',
};

const hookMocks = vi.hoisted((): { allCards: { data: HeroCard[]; isLoading: boolean } } => ({
  allCards: { data: [], isLoading: false },
}));

vi.mock('@/hooks/useHeroCards', () => ({
  useAllHeroCards: () => hookMocks.allCards,
  useHeroCardMutations: () => ({
    toggleVisibility: vi.fn(),
    deleteCard: vi.fn(),
    createCard: vi.fn(),
    isDeleting: false,
  }),
}));
vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => ({ divisions: [{ id: 'd1', display_division: 'Alpha' }] }),
}));
vi.mock('@/services/HeroCardService', () => ({
  HeroCardService: {
    fetchTeamsForChampions: vi.fn().mockResolvedValue([{ id: 'team1', name: 'Aces' }]),
  },
}));
vi.mock('../TargetSelector', () => ({
  TargetTypeSelector: () => <div />,
  TargetEntitySelector: () => <div />,
}));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isHomepage: false, currentTheme: 'default' }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));
vi.mock('@/components/hero/HeroCard', () => ({
  default: ({ card }: { card: HeroCard }) => (
    <div data-testid="hero-preview">
      {card.title}|{card.subtitle ?? 'none'}
    </div>
  ),
}));

const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );

const makeCard = (overrides: Partial<HeroCard> = {}): HeroCard => ({
  id: '1',
  slug: 'slug',
  title: 'Title',
  subtitle: null,
  body: null,
  cta_label: null,
  cta_url: null,
  background_color: 'bg-gradient-to-r from-blue-600 to-amber-500',
  text_color: 'text-white',
  accent_color: null,
  image_url: null,
  icon_name: null,
  is_visible: false,
  sort_order: 1,
  target_type: 'none',
  target_id: null,
  card_type: 'standard',
  metadata: {},
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('hero cards sections/views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.allCards = { data: [], isLoading: false };
  });

  it('section-level fields fire onChange handlers', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<CardBasicsSection formData={baseForm} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Headline'), 'x');
    expect(onChange).toHaveBeenCalledWith('title', expect.any(String));

    rerender(<CallToActionSection formData={baseForm} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Button Text'), 'Go');
    expect(onChange).toHaveBeenCalledWith('cta_label', expect.any(String));

    rerender(
      <TargetingDisplaySection formData={{ ...baseForm, card_type: 'event' }} onChange={onChange} />
    );
    await userEvent.type(screen.getByLabelText('Buy-in'), '$20');
    expect(onChange).toHaveBeenCalledWith('metadata', expect.any(String));

    rerender(
      <AdvancedSettingsSection
        formData={baseForm}
        onChange={onChange}
        isOpen
        onOpenChange={vi.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText('Icon Name (raw)'), 'Star');
    expect(onChange).toHaveBeenCalledWith('icon_name', expect.any(String));
  });

  it('champions and event winners editors update metadata', async () => {
    const onChange = vi.fn();
    wrap(
      <ChampionsEditor
        formData={{ ...baseForm, card_type: 'champions', metadata: '{"champions":{"Old":"x"}}' }}
        onChange={onChange}
      />
    );
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith('metadata', expect.stringContaining('champions'));

    render(
      <EventWinnersEditor
        formData={{
          ...baseForm,
          card_type: 'event',
          metadata:
            '{"past_winners":[{"week":1,"winners":[{"place":1,"names":"A"},{"place":2,"names":"B"}]}]}',
        }}
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Add Week/i }));
    const removeButtons = screen
      .getAllByRole('button')
      .filter((button) => button.className.includes('text-destructive-text'));
    await userEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith('metadata', expect.stringContaining('past_winners'));
  });

  it('clearing an event field removes only that key from the metadata', async () => {
    const onChange = vi.fn();
    render(
      <TargetingDisplaySection
        formData={{
          ...baseForm,
          card_type: 'event',
          metadata: '{"buy_in":"$10","payouts":"Top 3"}',
        }}
        onChange={onChange}
      />
    );
    await userEvent.clear(screen.getByLabelText('Buy-in'));
    const [field, json] = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(field).toBe('metadata');
    expect(JSON.parse(json)).toEqual({ payouts: 'Top 3' });
  });

  it('choosing None for a division removes only that champion', async () => {
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const onChange = vi.fn();
    wrap(
      <ChampionsEditor
        formData={{
          ...baseForm,
          card_type: 'champions',
          metadata: '{"champions":{"Alpha":"team1"},"note":"keep"}',
        }}
        onChange={onChange}
      />
    );
    await screen.findByText('Alpha');
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: /None/ }));
    const [field, json] = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(field).toBe('metadata');
    expect(JSON.parse(json)).toEqual({ champions: {}, note: 'keep' });
  });

  it('champions editor refuses to edit while the extra data box will not parse', () => {
    const onChange = vi.fn();
    wrap(
      <ChampionsEditor
        formData={{ ...baseForm, card_type: 'champions', metadata: '{oops' }}
        onChange={onChange}
        metadataError="Extra Data is not valid JSON"
      />
    );
    expect(screen.getByText('Extra Data is not valid JSON.')).toBeInTheDocument();
    expect(
      screen.getByText(/Fix "Extra Data \(JSON\)" under Advanced Settings/)
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('preview updates safely when optional fields are missing', () => {
    const card = makeCard({ title: 'Hello', subtitle: null });
    const { rerender } = render(<HeroCardPreview card={card} />);
    expect(screen.getByTestId('hero-preview')).toHaveTextContent('Hello|none');
    rerender(<HeroCardPreview card={{ ...card, title: 'Updated', subtitle: 'Sub' }} />);
    expect(screen.getByTestId('hero-preview')).toHaveTextContent('Updated|Sub');
  });

  it('HeroCardsTab state branches render loading, empty, and populated content', () => {
    hookMocks.allCards = { data: [], isLoading: true };
    const { rerender } = wrap(<HeroCardsTab />);
    expect(document.querySelectorAll('div.h-16').length).toBeGreaterThan(0);

    hookMocks.allCards = { data: [], isLoading: false };
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <HeroCardsTab />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('No hero cards yet')).toBeInTheDocument();

    hookMocks.allCards = { data: [makeCard()], isLoading: false };
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <HeroCardsTab />
        </QueryClientProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});
