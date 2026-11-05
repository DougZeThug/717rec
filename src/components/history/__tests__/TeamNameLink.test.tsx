import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import TeamNameLink from '../TeamNameLink';

const renderLink = (ui: React.ReactElement) => render(ui, { wrapper: MemoryRouter });

/** Shows where the router is, and what state came with the last navigation. */
const Where: React.FC = () => {
  const location = useLocation();
  return (
    <p data-testid="where">
      {location.pathname} state={JSON.stringify(location.state)}
    </p>
  );
};

describe('TeamNameLink', () => {
  describe('a team with a page', () => {
    it('links the name to the team page', () => {
      renderLink(<TeamNameLink name="Bag Bandits" />);

      expect(screen.getByRole('link', { name: 'Bag Bandits' })).toHaveAttribute(
        'href',
        '/teams/bag-bandits'
      );
    });

    it("builds the address the same way the other team links do, with symbols dropped (Baggin' & Braggin')", () => {
      renderLink(<TeamNameLink name="Baggin' & Braggin'" />);

      expect(screen.getByRole('link')).toHaveAttribute('href', '/teams/baggin-braggin');
    });

    it('uses the team name as the accessible name, with no separate label', () => {
      renderLink(<TeamNameLink name="Bag Bandits" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName('Bag Bandits');
      expect(link).toHaveTextContent('Bag Bandits');
      expect(link).not.toHaveAttribute('aria-label');
    });

    it('puts the look of the name on the text, not on the link', () => {
      renderLink(<TeamNameLink name="Bag Bandits" className="font-semibold line-clamp-2" />);

      // The cut (clamp or truncate) hides overflow, which would hide the grown tap area, so
      // it lives on the text inside the link.
      const text = screen.getByText('Bag Bandits');
      expect(text).toHaveClass('font-semibold', 'line-clamp-2');
      expect(text.parentElement).toBe(screen.getByRole('link'));
      expect(screen.getByRole('link')).not.toHaveClass('line-clamp-2');
      expect(screen.getByRole('link')).not.toHaveClass('overflow-hidden');
    });

    it('shows no underline until hover, and a visible ring when it has keyboard focus', () => {
      renderLink(<TeamNameLink name="Bag Bandits" />);

      const link = screen.getByRole('link');
      expect(link).toHaveClass('hover:underline');
      expect(link).not.toHaveClass('underline');
      expect(link).toHaveClass(
        'focus-visible:outline-hidden',
        'focus-visible:ring-2',
        'focus-visible:ring-ring'
      );
    });

    it('lets the link shrink inside a row so a long name wraps or cuts instead of pushing the row wide', () => {
      renderLink(<TeamNameLink name="Bag Bandits" />);

      expect(screen.getByRole('link')).toHaveClass('min-w-0');
    });

    it('grows the tap area to 44px by default', () => {
      renderLink(<TeamNameLink name="Bag Bandits" />);

      expect(screen.getByRole('link')).toHaveClass('hit-area-44');
    });

    it('can use a small tap area where rows are close together, without the 44px area', () => {
      renderLink(<TeamNameLink name="Bag Bandits" tapArea="small" />);

      const link = screen.getByRole('link');
      expect(link).not.toHaveClass('hit-area-44');
      // 6px above and below, taken back with a negative margin so the layout does not move.
      expect(link).toHaveClass('py-1.5', '-my-1.5', 'relative');
    });

    it('opens the team page and sends no state with it', () => {
      render(
        <MemoryRouter initialEntries={['/history']}>
          <Routes>
            <Route
              path="/history"
              element={
                <>
                  <Where />
                  <TeamNameLink name="Bag Bandits" />
                </>
              }
            />
            <Route path="/teams/:slug" element={<Where />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('link', { name: 'Bag Bandits' }));

      // Nothing on the team page reads route state, so none is sent (the router reports null).
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/teams\/bag-bandits state=null$/);
    });
  });

  describe('a team with no page', () => {
    it('keeps "Unknown Team" as plain text, because its address would be a 404', () => {
      renderLink(<TeamNameLink name="Unknown Team" className="font-semibold" />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Unknown Team')).toHaveClass('font-semibold');
    });

    it('keeps a name that has no letters or numbers as plain text', () => {
      renderLink(<TeamNameLink name="!!!" />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('!!!')).toBeInTheDocument();
    });

    it('still links a team that only looks like it, such as "Unknown Team Two"', () => {
      renderLink(<TeamNameLink name="Unknown Team Two" />);

      expect(screen.getByRole('link', { name: 'Unknown Team Two' })).toHaveAttribute(
        'href',
        '/teams/unknown-team-two'
      );
    });
  });
});
