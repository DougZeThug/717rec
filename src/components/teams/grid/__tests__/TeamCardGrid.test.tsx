import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Team } from '@/types';

import { TeamCardGrid } from '../TeamCardGrid';

let isAdminAccessGranted = false;
let isMobile = false;
let isWinterTheme = false;

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, className }, ref) => (
        <div ref={ref} className={className}>
          {children}
        </div>
      )
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: () => ({ isAdminAccessGranted }),
}));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => isMobile }));
vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalTheme: () => ({ isWinterTheme }),
  useSeasonalThemeBase: () => ({ isWinterTheme }),
}));

/** Radix drives the actions menu. */
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const makeTeam = (overrides: Partial<Team> = {}): Team =>
  ({
    id: 't1',
    name: 'Bag Fumblers',
    wins: 5,
    losses: 2,
    power_score: 72.45,
    divisionName: 'Competitive',
    imageUrl: 'https://example.test/logo.png',
    ...overrides,
  }) as Team;

const renderCard = (props: Partial<React.ComponentProps<typeof TeamCardGrid>> = {}) =>
  render(
    <MemoryRouter>
      <TeamCardGrid team={makeTeam()} {...props} />
    </MemoryRouter>
  );

describe('TeamCardGrid', () => {
  beforeEach(() => {
    isAdminAccessGranted = false;
    isMobile = false;
    isWinterTheme = false;
  });

  describe('what it shows', () => {
    it('names the team and links the name to its page', () => {
      renderCard();

      const heading = screen.getByRole('heading', { name: 'Bag Fumblers' });
      expect(heading).toBeInTheDocument();
      expect(heading.closest('a')).toHaveAttribute('href', '/teams/bag-fumblers');
    });

    it('shows the record and the power score to one decimal', () => {
      renderCard();

      expect(screen.getByText('5-2')).toBeInTheDocument();
      expect(screen.getByText('72.5')).toBeInTheDocument();
    });

    it('reads N/A for a team with no power score yet', () => {
      renderCard({ team: makeTeam({ power_score: null }) });

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('shows the division on its badge', () => {
      renderCard();

      expect(screen.getByText('Competitive')).toBeInTheDocument();
    });

    it('leaves the badge off a team with no division', () => {
      renderCard({ team: makeTeam({ divisionName: null }) });

      expect(screen.queryByText('Competitive')).not.toBeInTheDocument();
    });

    it.each([
      ['Competitive', 'competitive'],
      ['Intermediate', 'intermediate'],
      ['Recreational', 'recreational'],
      ['Summer Rec', 'recreational'],
    ])('gives the %s badge its own colour', (divisionName, variant) => {
      renderCard({ team: makeTeam({ divisionName }) });

      // Each division reads its variant off the name, case-insensitively, and
      // anything unrecognised falls back to recreational rather than crashing.
      expect(screen.getByText(divisionName).className).toContain(variant);
    });

    it('greys out a hidden division instead of colouring it', () => {
      renderCard({ team: makeTeam({ divisionName: 'Hidden Division' }) });

      expect(screen.getByText('Hidden Division').className).toContain('text-muted-foreground');
    });
  });

  describe('on a phone', () => {
    it('drops to the record alone, with no stats grid and no menu', () => {
      isMobile = true;
      isAdminAccessGranted = true;
      renderCard({ onEdit: vi.fn() });

      expect(screen.getByText('5-2')).toBeInTheDocument();
      expect(screen.queryByText('Power')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
    });
  });

  describe('the actions menu', () => {
    it('offers only View Details to a visitor', async () => {
      const user = userEvent.setup();
      renderCard({ onEdit: vi.fn(), onDelete: vi.fn() });

      await user.click(screen.getByRole('button', { name: 'Open menu' }));

      expect(await screen.findByRole('menuitem', { name: /View Details/ })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Edit/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Delete/ })).not.toBeInTheDocument();
    });

    it('offers Edit and Delete to an admin, and hands back the right team', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      isAdminAccessGranted = true;
      renderCard({ onEdit, onDelete });

      await user.click(screen.getByRole('button', { name: 'Open menu' }));
      await user.click(await screen.findByRole('menuitem', { name: /Edit/ }));
      expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));

      await user.click(screen.getByRole('button', { name: 'Open menu' }));
      await user.click(await screen.findByRole('menuitem', { name: /Delete/ }));
      expect(onDelete).toHaveBeenCalledWith('t1');
    });

    it('hides Edit from an admin when the page passed no edit handler', async () => {
      const user = userEvent.setup();
      isAdminAccessGranted = true;
      renderCard({ onDelete: vi.fn() });

      await user.click(screen.getByRole('button', { name: 'Open menu' }));

      expect(await screen.findByRole('menuitem', { name: /Delete/ })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Edit/ })).not.toBeInTheDocument();
    });
  });

  describe('the card surface', () => {
    const header = (c: HTMLElement) => c.querySelector('.overflow-hidden') as HTMLElement;

    it('washes the header and body in the theme tint on a normal page', () => {
      const { container } = renderCard();

      expect(header(container).className).toContain('bg-gradient-to-br');
      // The sheen behind the name and stats, written once as tokens.
      expect(container.innerHTML).toContain('from-muted to-card');
    });

    it('drops both washes under the winter theme, which paints its own surface', () => {
      isWinterTheme = true;
      const { container } = renderCard();

      expect(header(container).className).toContain('bg-transparent');
      expect(container.innerHTML).not.toContain('from-muted to-card');
    });
  });
});
