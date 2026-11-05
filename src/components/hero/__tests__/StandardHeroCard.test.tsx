import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const theme = vi.hoisted(() => ({ shouldApplyWinter: false }));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinter: theme.shouldApplyWinter }),
}));

import type { HeroCard } from '@/types/heroCard';

import StandardHeroCard from '../StandardHeroCard';

const makeCard = (overrides: Partial<HeroCard> = {}): HeroCard => ({
  id: 'card-1',
  slug: 'join-league',
  title: 'Join the League',
  subtitle: null,
  body: null,
  cta_label: null,
  cta_url: null,
  background_color: 'bg-blue-900',
  text_color: 'text-white',
  accent_color: null,
  image_url: null,
  icon_name: null,
  is_visible: true,
  sort_order: 1,
  target_type: 'none',
  target_id: null,
  card_type: 'standard',
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const renderCard = (overrides: Partial<HeroCard> = {}) =>
  render(
    <MemoryRouter>
      <StandardHeroCard card={makeCard(overrides)} />
    </MemoryRouter>
  );

describe('StandardHeroCard', () => {
  beforeEach(() => {
    theme.shouldApplyWinter = false;
  });

  describe('a card with no link', () => {
    it('shows the title as plain text, with no link and no arrow', () => {
      const { container } = renderCard();

      expect(screen.getByText('Join the League')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('keeps the wrapper out of the Tab order', () => {
      const { container } = renderCard();

      // The wrapper has nothing to do, so it must not be a Tab stop.
      expect(container.firstElementChild).toHaveAttribute('tabindex', '-1');
    });

    it('uses the card colours', () => {
      renderCard();

      const card = screen.getByText('Join the League').closest('.group');
      expect(card).toHaveClass('bg-blue-900', 'text-white', 'overflow-hidden');
      expect(card).not.toHaveClass('winter-card-full');
    });
  });

  describe('the icon', () => {
    it('shows the icon named on the card', () => {
      const { container } = renderCard({ icon_name: 'Trophy' });

      expect(container.querySelector('svg.lucide-trophy')).toBeInTheDocument();
    });

    it('shows no icon when the card names none', () => {
      const { container } = renderCard({ icon_name: null });

      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('shows no icon, and no crash, when the name is not a known icon', () => {
      const { container } = renderCard({ icon_name: 'NotARealIcon' });

      expect(screen.getByText('Join the League')).toBeInTheDocument();
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('a card that links inside the site', () => {
    it('is one link with the title, an arrow and no new tab', () => {
      const { container } = renderCard({ cta_url: '/schedule', icon_name: 'Calendar' });

      const link = screen.getByRole('link', { name: 'Join the League' });
      expect(link).toHaveAttribute('href', '/schedule');
      expect(link).not.toHaveAttribute('target');
      expect(container.querySelector('svg.lucide-chevron-right')).toBeInTheDocument();
      expect(container.querySelector('svg.lucide-calendar')).toBeInTheDocument();
    });

    it('keeps the wrapper out of the Tab order, so the link is the only stop', () => {
      const { container } = renderCard({ cta_url: '/schedule' });

      expect(container.firstElementChild).toHaveAttribute('tabindex', '-1');
      expect(container.firstElementChild).not.toHaveAttribute('href');
    });
  });

  describe('a card that links outside the site', () => {
    it('opens in a new tab without giving the other site access to this one', () => {
      const { container } = renderCard({ cta_url: 'https://example.com/signup' });

      const link = screen.getByRole('link', { name: 'Join the League' });
      expect(link).toHaveAttribute('href', 'https://example.com/signup');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(container.querySelector('svg.lucide-chevron-right')).toBeInTheDocument();
    });
  });

  describe('in the winter theme', () => {
    beforeEach(() => {
      theme.shouldApplyWinter = true;
    });

    it('uses the winter card, not the colours saved on the card', () => {
      renderCard();

      const card = screen.getByText('Join the League').closest('.group');
      expect(card).toHaveClass('winter-card-full', 'overflow-visible', 'text-cyan-50');
      expect(card).not.toHaveClass('bg-blue-900');
      expect(card).not.toHaveClass('text-white');
    });

    it('uses the winter card on a link too', () => {
      renderCard({ cta_url: '/schedule' });

      expect(screen.getByRole('link', { name: 'Join the League' })).toHaveClass('winter-card-full');
    });

    it('uses the winter card on an outside link too', () => {
      renderCard({ cta_url: 'https://example.com' });

      expect(screen.getByRole('link', { name: 'Join the League' })).toHaveClass('winter-card-full');
    });
  });
});
