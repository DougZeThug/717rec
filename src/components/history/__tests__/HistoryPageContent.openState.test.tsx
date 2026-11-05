import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readOpen, writeOpen } from '@/utils/historyOpenState';

import HistoryPageContent from '../HistoryPageContent';

// The page remembers which seasons are open, but only for Back, Forward and a reload.
// Any other way in (a link, the top bar) must open it fully collapsed.

const STORAGE_KEY = 'history_open_state';

vi.mock('@/hooks/useSeasons', () => ({
  useHistoricalSeasons: () => ({
    data: [{ id: 's1' }],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/winter/WinterSection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
// A stand-in season that reads the memory while it is drawn, the way the real one does,
// and lets the test "open" it by hand.
vi.mock('../SeasonAccordion', () => {
  const StandInSeason = ({ season }: { season: { id: string } }) => {
    const [remembered] = React.useState(() => readOpen(`season:${season.id}`));
    return (
      <div>
        <p data-testid="remembered">{String(remembered)}</p>
        <button type="button" onClick={() => writeOpen(`season:${season.id}`, true)}>
          open by hand
        </button>
      </div>
    );
  };
  return { default: StandInSeason };
});

const Back: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      go back
    </button>
  );
};

/** Home page with a link to the history page, the history page, a team page, and a Back button. */
const renderSite = (props: { initialEntries?: string[]; replace?: boolean } = {}) =>
  render(
    <MemoryRouter initialEntries={props.initialEntries ?? ['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <Link to="/history" replace={props.replace}>
              to history
            </Link>
          }
        />
        <Route
          path="/history"
          element={
            <>
              <HistoryPageContent />
              <Link to="/teams/bag-bandits">to team</Link>
            </>
          }
        />
        <Route path="/teams/:slug" element={<p>team page</p>} />
      </Routes>
      <Back />
    </MemoryRouter>
  );

const remember = () =>
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ 'season:s1': true, 'division:s1:Competitive': true })
  );

describe('HistoryPageContent open state', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps what is open when the page is loaded again (a reload, or the first page of a visit)', () => {
    remember();

    // A fresh router starts with a POP, like a reload does.
    renderSite({ initialEntries: ['/history'] });

    expect(screen.getByTestId('remembered')).toHaveTextContent('true');
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('opens fully collapsed when the visitor arrives by a link, and forgets the old memory', () => {
    remember();
    renderSite();

    fireEvent.click(screen.getByText('to history'));

    // The season is drawn after the memory is cleared, not before.
    expect(screen.getByTestId('remembered')).toHaveTextContent('undefined');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('opens fully collapsed when the link replaces the page instead of adding to it', () => {
    remember();
    renderSite({ replace: true });

    fireEvent.click(screen.getByText('to history'));

    expect(screen.getByTestId('remembered')).toHaveTextContent('undefined');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('brings back what was open when the visitor returns from a team page with Back', () => {
    renderSite();
    fireEvent.click(screen.getByText('to history')); // arrive by a link: collapsed
    expect(screen.getByTestId('remembered')).toHaveTextContent('undefined');

    fireEvent.click(screen.getByText('open by hand')); // open a season
    fireEvent.click(screen.getByText('to team')); // follow a team link
    fireEvent.click(screen.getByText('go back')); // press Back

    expect(screen.getByTestId('remembered')).toHaveTextContent('true');
  });

  it('starts collapsed again after the visitor leaves and comes back by a link', () => {
    renderSite();
    fireEvent.click(screen.getByText('to history'));
    fireEvent.click(screen.getByText('open by hand'));
    fireEvent.click(screen.getByText('to team'));
    fireEvent.click(screen.getByText('go back')); // Back to history (remembered)
    fireEvent.click(screen.getByText('go back')); // Back again, to the home page

    fireEvent.click(screen.getByText('to history')); // now a fresh arrival

    expect(screen.getByTestId('remembered')).toHaveTextContent('undefined');
  });
});
