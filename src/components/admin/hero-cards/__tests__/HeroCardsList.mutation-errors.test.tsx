import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCard } from '@/types/heroCard';

const toggleVisibility = vi.fn();
const deleteCard = vi.fn();

vi.mock('@/hooks/useHeroCards', () => ({
  useHeroCardMutations: () => ({
    toggleVisibility,
    deleteCard,
    createCard: vi.fn(),
    isCreating: false,
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

const heroCard = {
  id: '1',
  slug: 'blind-draw',
  title: 'Blind Draw',
  is_visible: true,
  sort_order: 0,
  target_type: 'none',
  card_type: 'standard',
  background_color: 'x',
} as unknown as HeroCard;

const renderList = () =>
  render(
    <MemoryRouter>
      <HeroCardsList cards={[heroCard]} isLoading={false} onEdit={vi.fn()} />
    </MemoryRouter>
  );

describe('HeroCardsList failed mutations', () => {
  const unhandled = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.on('unhandledRejection', unhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', unhandled);
  });

  it('does not leave an unhandled rejection when the toggle fails', async () => {
    toggleVisibility.mockRejectedValue(new Error('nope'));
    renderList();

    await userEvent.click(screen.getByRole('switch'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toggleVisibility).toHaveBeenCalledWith({ id: '1', is_visible: false });
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('closes the delete dialog and leaves no unhandled rejection when the delete fails', async () => {
    deleteCard.mockRejectedValue(new Error('nope'));
    renderList();

    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(deleteCard).toHaveBeenCalledWith('1');
    expect(unhandled).not.toHaveBeenCalled();
  });
});
