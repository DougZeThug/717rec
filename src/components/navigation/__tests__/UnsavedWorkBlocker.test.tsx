import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { createMemoryRouter, Link, Outlet, RouterProvider, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearUnsavedWork, registerUnsavedWork } from '@/utils/unsavedChanges';

import { UnsavedWorkBlocker } from '../UnsavedWorkBlocker';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const Layout = () => (
  <>
    <UnsavedWorkBlocker />
    <Link to="/teams">Teams</Link>
    <LocationProbe />
    <Outlet />
  </>
);

const routes = [
  {
    element: <Layout />,
    children: [
      { path: '/admin/scores', element: <p>Mass Score Entry</p> },
      { path: '/teams', element: <p>Teams page</p> },
    ],
  },
];

/** A router already two entries deep, so there is somewhere to go Back to. */
const renderApp = () => {
  const router = createMemoryRouter(routes, {
    initialEntries: ['/teams', '/admin/scores'],
    initialIndex: 1,
  });
  render(<RouterProvider router={router} />);
  return router;
};

const atScoreEntry = () =>
  expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
const atTeams = () => expect(screen.getByTestId('location')).toHaveTextContent('/teams');

/**
 * Back and Forward were the one way out of an unsaved admin section that never
 * asked. Every click is asked about where the click happens; a history press
 * has no click, so the router catches it instead.
 */
describe('UnsavedWorkBlocker', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearUnsavedWork();
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    clearUnsavedWork();
  });

  describe('with unsaved work on screen', () => {
    beforeEach(() => {
      registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });
    });

    it('asks before Back throws it away', async () => {
      const router = renderApp();
      atScoreEntry();

      await router.navigate(-1);

      await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores'));
      await waitFor(atTeams);
    });

    it('stays put when the admin says no', async () => {
      confirmSpy.mockReturnValue(false);
      const router = renderApp();

      await router.navigate(-1);

      await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
      atScoreEntry();
    });

    // Refusing must leave the history usable, not half-undone.
    it('asks again on a second press, and still obeys', async () => {
      confirmSpy.mockReturnValue(false);
      const router = renderApp();

      await router.navigate(-1);
      await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
      atScoreEntry();

      await router.navigate(-1);
      await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(2));
      atScoreEntry();

      // And once the answer changes, the press it refused still works.
      confirmSpy.mockReturnValue(true);
      await router.navigate(-1);
      await waitFor(atTeams);
    });

    /**
     * The whole reason this is limited to POP. Clicks are already asked about
     * by `confirmLeavingClick`, so a blocker that caught them too would put up
     * two prompts for one press.
     */
    it('leaves a clicked link alone, so nothing asks twice', async () => {
      renderApp();

      await userEvent.click(screen.getByRole('link', { name: 'Teams' }));

      expect(confirmSpy).not.toHaveBeenCalled();
      atTeams();
    });
  });

  it('never asks while there is nothing to lose', async () => {
    const router = renderApp();

    await router.navigate(-1);

    await waitFor(atTeams);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('never asks for work that is registered but clean', async () => {
    registerUnsavedWork({ isDirty: () => false, message: 'Nothing typed yet' });
    const router = renderApp();

    await router.navigate(-1);

    await waitFor(atTeams);
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
