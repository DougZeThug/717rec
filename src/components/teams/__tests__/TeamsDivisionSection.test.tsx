import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeamsDivisionSection } from '@/components/teams/TeamsDivisionSection';
import type { Team } from '@/types';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/components/teams/TeamList', () => ({
  TeamList: ({ teams }: { teams: Team[] }) => (
    <div data-testid="team-list">{teams.map((t) => t.name).join(', ')}</div>
  ),
}));

const scrollTo = vi.fn();

const teams = [
  { id: 't-1', name: 'Rail Riders' },
  { id: 't-2', name: 'Bag Bandits' },
] as unknown as Team[];

const baseProps = {
  divisionName: 'Competitive',
  teams,
  isExpanded: false,
  scrollIntoViewOnExpand: false,
  onToggleExpand: vi.fn(),
  onEditTeam: vi.fn(),
  onDeleteTeam: vi.fn(),
  isLoading: false,
  viewMode: 'grid' as const,
};

const renderSection = (props: Partial<React.ComponentProps<typeof TeamsDivisionSection>> = {}) => {
  const onToggleExpand = vi.fn();
  const view = render(
    <TeamsDivisionSection {...baseProps} onToggleExpand={onToggleExpand} {...props} />
  );
  return { onToggleExpand, ...view };
};

describe('TeamsDivisionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    // Named frameCallback, not cb: a parameter called `cb` reads as a
    // Node-style callback, making `cb(0)` look like passing 0 as an error.
    vi.stubGlobal('requestAnimationFrame', (frameCallback: FrameRequestCallback) => {
      frameCallback(0);
      return 0;
    });
  });

  it('names the division and counts its teams', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: /Competitive/ })).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('exposes the header as a button that reports whether the division is open', () => {
    const { rerender } = renderSection();

    const trigger = screen.getByRole('button', { name: /Competitive/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    rerender(<TeamsDivisionSection {...baseProps} isExpanded />);

    expect(screen.getByRole('button', { name: /Competitive/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('points the header at the team list it opens', () => {
    renderSection({ isExpanded: true });

    const trigger = screen.getByRole('button', { name: /Competitive/ });
    const contentId = trigger.getAttribute('aria-controls');

    expect(contentId).toBeTruthy();
    expect(document.getElementById(contentId as string)).toContainElement(
      screen.getByTestId('team-list')
    );
  });

  it('hides the teams until the section is expanded', () => {
    renderSection();

    expect(screen.queryByTestId('team-list')).not.toBeInTheDocument();
  });

  it('lists the teams once expanded', () => {
    renderSection({ isExpanded: true });

    expect(screen.getByTestId('team-list')).toHaveTextContent('Rail Riders, Bag Bandits');
  });

  it('asks to be expanded when the header is pressed', async () => {
    const { onToggleExpand } = renderSection();

    await userEvent.click(screen.getByRole('button', { name: /Competitive/ }));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('scrolls the section into view when the visitor opens it', () => {
    const { rerender } = renderSection();

    expect(scrollTo).not.toHaveBeenCalled();

    rerender(<TeamsDivisionSection {...baseProps} isExpanded scrollIntoViewOnExpand />);

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('does not scroll the page for a division that opens by default', () => {
    // The real sequence: closed on mount while the teams load, then opened by
    // the parent once they arrive. Nobody pressed anything, so the page must
    // not move — including off the position the Teams page just restored.
    const { rerender } = renderSection();

    rerender(<TeamsDivisionSection {...baseProps} isExpanded />);

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll while the section stays closed', () => {
    renderSection();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('renders nothing for a division with no teams', () => {
    const { container } = render(
      <TeamsDivisionSection {...baseProps} divisionName="Empty" teams={[]} isExpanded />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
