import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCard } from '@/types/heroCard';

const createCard = vi.fn();
const mutationState = { isCreating: false };

vi.mock('@/hooks/useHeroCards', () => ({
  useHeroCardMutations: () => ({
    toggleVisibility: vi.fn(),
    deleteCard: vi.fn(),
    createCard,
    isCreating: mutationState.isCreating,
    isDeleting: false,
  }),
}));

import HeroCardsList from '../HeroCardsList';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const card = (id: string, slug: string, title: string) =>
  ({
    id,
    slug,
    title,
    subtitle: null,
    body: null,
    cta_label: null,
    cta_url: null,
    background_color: null,
    text_color: null,
    accent_color: null,
    image_url: null,
    icon_name: null,
    is_visible: true,
    sort_order: 0,
    target_type: 'none',
    target_id: null,
    card_type: 'standard',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }) as unknown as HeroCard;

const renderList = (cards: HeroCard[]) =>
  render(
    <MemoryRouter>
      <HeroCardsList cards={cards} isLoading={false} onEdit={vi.fn()} />
    </MemoryRouter>
  );

describe('HeroCardsList duplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationState.isCreating = false;
    createCard.mockImplementation(() => Promise.resolve());
  });

  it('creates a -copy when the slug is free', async () => {
    renderList([card('1', 'blind-draw', 'Blind Draw')]);

    await userEvent.click(screen.getByRole('button', { name: 'Duplicate card' }));

    expect(createCard).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'blind-draw-copy', title: 'Blind Draw (Copy)' })
    );
  });

  it('walks past a taken -copy instead of colliding on the unique slug', async () => {
    // hero_cards.slug is UNIQUE, so reusing -copy would be refused by the database.
    renderList([card('1', 'blind-draw', 'Blind Draw'), card('2', 'blind-draw-copy', 'Copy')]);

    await userEvent.click(screen.getAllByRole('button', { name: 'Duplicate card' })[0]);

    expect(createCard).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'blind-draw-copy-2', title: 'Blind Draw (Copy 2)' })
    );
  });

  it('creates the copy hidden so it cannot reach the homepage unreviewed', async () => {
    renderList([card('1', 'blind-draw', 'Blind Draw')]);

    await userEvent.click(screen.getByRole('button', { name: 'Duplicate card' }));

    expect(createCard).toHaveBeenCalledWith(expect.objectContaining({ is_visible: false }));
  });

  it('disables the button while a card is being created', () => {
    mutationState.isCreating = true;
    renderList([card('1', 'blind-draw', 'Blind Draw')]);

    expect(screen.getByRole('button', { name: 'Duplicate card' })).toBeDisabled();
  });

  it('does not leave an unhandled rejection when the create fails', async () => {
    createCard.mockRejectedValue(new Error('nope'));
    renderList([card('1', 'blind-draw', 'Blind Draw')]);

    await expect(
      userEvent.click(screen.getByRole('button', { name: 'Duplicate card' }))
    ).resolves.not.toThrow();
  });
});
