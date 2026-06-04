import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hookMocks = vi.hoisted(() => ({
  config: {
    data: {
      id: 'cfg-1',
      enabled: true,
      header_title: 'My Playoffs',
      header_subtitle: 'Live brackets here',
    } as { id: string; enabled: boolean; header_title: string; header_subtitle: string } | null,
  },
  brackets: {
    data: [
      { id: 'b-1', title: 'Competitive', slug: 'abc123', sort_order: 0 },
      { id: 'b-2', title: 'Recreational', slug: 'xyz789', sort_order: 1 },
    ] as Array<{ id: string; title: string; slug: string; sort_order: number }>,
  },
}));

vi.mock('@/hooks/useChallongeFallback', () => ({
  useChallongeFallbackConfig: () => hookMocks.config,
  useChallongeFallbackBrackets: () => hookMocks.brackets,
}));

import { ChallongeFallback } from '../ChallongeFallback';

describe('ChallongeFallback', () => {
  beforeEach(() => {
    hookMocks.config.data = {
      id: 'cfg-1',
      enabled: true,
      header_title: 'My Playoffs',
      header_subtitle: 'Live brackets here',
    };
    hookMocks.brackets.data = [
      { id: 'b-1', title: 'Competitive', slug: 'abc123', sort_order: 0 },
      { id: 'b-2', title: 'Recreational', slug: 'xyz789', sort_order: 1 },
    ];
  });

  it('renders nothing when there are no brackets', () => {
    hookMocks.brackets.data = [];
    const { container } = render(<ChallongeFallback />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders header title, subtitle, and one row per bracket', () => {
    render(<ChallongeFallback />);
    expect(screen.getByRole('heading', { name: 'My Playoffs' })).toBeInTheDocument();
    expect(screen.getByText('Live brackets here')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Competitive' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recreational' })).toBeInTheDocument();
  });

  it('toggles the expand-all button label', async () => {
    const user = userEvent.setup();
    render(<ChallongeFallback />);
    const button = screen.getByRole('button', { name: /expand all/i });
    await user.click(button);
    expect(screen.getByRole('button', { name: /collapse all/i })).toBeInTheDocument();
  });

  it('shows the iframe for a bracket when clicked', async () => {
    const user = userEvent.setup();
    render(<ChallongeFallback />);
    await user.click(screen.getByRole('heading', { name: 'Competitive' }));
    const iframe = screen.getByTitle('Competitive Bracket') as HTMLIFrameElement;
    expect(iframe.src).toContain('challonge.com/abc123/module');
  });
});