import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeroCard } from '@/types/heroCard';

const toggleVisibility = vi.fn();
const deleteCard = vi.fn();
let mockIsMobile = false;

vi.mock('@/hooks/useHeroCards', () => ({
  useHeroCardMutations: () => ({
    toggleVisibility,
    deleteCard,
    createCard: vi.fn(),
    isCreating: false,
    isDeleting: false,
  }),
}));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile }));

import HeroCardsList from '../HeroCardsList';

/**
 * The hero-card row is declared as one `columns` array now rather than
 * hand-written table markup, and its three actions are one `HeroCardAction`
 * used three times. These cover what that rewrite is responsible for: the
 * headings, the cells, the actions, and the card rendering on a phone.
 */
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const card = (overrides: Partial<HeroCard> = {}) =>
  ({
    id: 'card-1',
    slug: 'blind-draw',
    title: 'Blind Draw',
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
    sort_order: 3,
    target_type: 'none',
    target_id: null,
    card_type: 'standard',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as unknown as HeroCard;

const renderList = (cards: HeroCard[] = [card()], onEdit = vi.fn()) => {
  render(
    <MemoryRouter>
      <HeroCardsList cards={cards} isLoading={false} onEdit={onEdit} />
    </MemoryRouter>
  );
  return { onEdit };
};

describe('HeroCardsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
  });

  it('gives every column a scoped heading', () => {
    renderList();

    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Order',
      'Theme',
      'Card Name',
      'Type',
      'Target',
      'On Homepage?',
      'Actions',
    ]);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });

  it('shows the card name, its internal id and its sort order', () => {
    renderList();

    expect(screen.getByText('Blind Draw')).toBeInTheDocument();
    expect(screen.getAllByText('blind-draw').length).toBeGreaterThan(0);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('says whether the card is on the homepage, in words as well as by switch', () => {
    renderList([card({ is_visible: false })]);
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('toggles visibility from the switch', async () => {
    renderList();

    await userEvent.click(screen.getByRole('switch', { name: 'Show Blind Draw on the homepage' }));

    expect(toggleVisibility).toHaveBeenCalledWith({ id: 'card-1', is_visible: false });
  });

  it('opens the editor from the row action', async () => {
    const { onEdit } = renderList();

    await userEvent.click(screen.getByRole('button', { name: 'Edit card' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'card-1' }));
  });

  it('asks before deleting, and names the card it will delete', async () => {
    renderList();

    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Blind Draw');
    expect(deleteCard).not.toHaveBeenCalled();
  });

  it('shows its own empty state rather than an empty table', () => {
    renderList([]);

    expect(screen.getByText('No hero cards yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('becomes a labelled list of cards on a phone, not a table', () => {
    mockIsMobile = true;
    renderList();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Hero cards on the home page' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    // The column heading is reused verbatim as the card's label.
    expect(within(list).getByText('On Homepage?')).toBeInTheDocument();
  });
});
