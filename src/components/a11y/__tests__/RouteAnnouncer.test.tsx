import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';

import { RouteAnnouncer } from '../RouteAnnouncer';

/**
 * Renders the announcer alongside a focusable <main> and a couple of routes,
 * plus a button that navigates so we can assert post-navigation behavior.
 */
const Harness: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <RouteAnnouncer />
      <button type="button" onClick={() => navigate('/schedule')}>
        go
      </button>
      <main tabIndex={-1} data-testid="main">
        <Routes>
          <Route path="/" element={<h1>Home</h1>} />
          <Route path="/schedule" element={<h1>Schedule</h1>} />
        </Routes>
      </main>
    </>
  );
};

describe('RouteAnnouncer', () => {
  it('does not announce or move focus on the initial render', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.getByTestId('main')).not.toHaveFocus();
  });

  it('stays a no-op on initial load under StrictMode double-invoke', () => {
    // StrictMode runs effects setup → cleanup → setup in dev. The guard must
    // survive that cycle and still not announce or steal focus on first load.
    render(
      <React.StrictMode>
        <MemoryRouter initialEntries={['/']}>
          <Harness />
        </MemoryRouter>
      </React.StrictMode>
    );

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.getByTestId('main')).not.toHaveFocus();
  });

  it('announces the new page heading after navigation', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'go' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Schedule');
    });
  });
});
