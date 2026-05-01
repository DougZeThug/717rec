import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import AnnouncementHeroCard from '@/components/hero/AnnouncementHeroCard';
import { HeroCard } from '@/types/heroCard';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ shouldApplyWinter: false }),
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

describe('AnnouncementHeroCard', () => {
  const baseCard: HeroCard = {
    id: '1',
    slug: 'spring-finals',
    title: 'Spring Finals',
    subtitle: 'Join us this weekend',
    body: null,
    cta_label: null,
    cta_url: null,
    accent_color: null,
    image_url: null,
    card_type: 'announcement',
    icon_name: 'Trophy',
    text_color: 'text-white',
    background_color: 'bg-blue-500',
    is_visible: true,
    sort_order: 1,
    target_type: 'none',
    target_id: null,
    metadata: {},
    created_at: '',
    updated_at: '',
  };

  it('renders internal CTA route links and visible text', () => {
    render(
      <MemoryRouter>
        <AnnouncementHeroCard card={{ ...baseCard, cta_url: '/playoffs' }} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Spring Finals' })).toBeInTheDocument();
    expect(screen.getByText('Join us this weekend')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/playoffs');
  });

  it('renders external CTA and opens in a new tab', () => {
    render(
      <MemoryRouter>
        <AnnouncementHeroCard card={{ ...baseCard, cta_url: 'https://example.com/finals' }} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/finals');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('matches snapshot without CTA link', () => {
    const { asFragment } = render(
      <MemoryRouter>
        <AnnouncementHeroCard card={baseCard} />
      </MemoryRouter>
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
