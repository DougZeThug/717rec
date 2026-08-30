import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollToTop } from '../ScrollToTop';

const scrollTo = vi.fn();

beforeEach(() => {
  vi.stubGlobal('scrollTo', scrollTo);
  scrollTo.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Go back
    </button>
  );
};

const App = () => (
  <>
    <ScrollToTop />
    <Routes>
      <Route
        path="/schedule"
        element={
          <>
            <Link to="/help">To help</Link>
            <Link to="/schedule?week=2">Same page, new query</Link>
          </>
        }
      />
      <Route path="/help" element={<BackButton />} />
    </Routes>
  </>
);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

describe('ScrollToTop', () => {
  it('does not scroll on the initial render', () => {
    renderAt('/schedule');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to the top when the path changes', async () => {
    renderAt('/schedule');

    await userEvent.click(screen.getByRole('link', { name: 'To help' }));

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not scroll when only the query string changes', async () => {
    // Compare calls setSearchParams({ replace: true }) on every pick; reacting
    // to that would yank the user to the top mid-interaction.
    renderAt('/schedule');

    await userEvent.click(screen.getByRole('link', { name: 'Same page, new query' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('leaves a back navigation to the browser and useScrollRestoration', async () => {
    // A POP must be skipped: this effect fires on commit and would beat
    // useScrollRestoration, which defers through a frame and then retries.
    renderAt('/schedule');

    await userEvent.click(screen.getByRole('link', { name: 'To help' }));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockClear();

    await userEvent.click(screen.getByRole('button', { name: 'Go back' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
