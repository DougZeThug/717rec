import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearUnsavedWork, registerUnsavedWork } from '@/utils/unsavedChanges';

import NavBrand from '../NavBrand';

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderBrand = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavBrand />
      <LocationProbe />
    </MemoryRouter>
  );

describe('NavBrand', () => {
  beforeEach(() => clearUnsavedWork());
  afterEach(() => clearUnsavedWork());

  it('goes home', async () => {
    renderBrand('/admin/scores');

    await userEvent.click(screen.getByRole('link'));

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  /**
   * The shortest route out of the admin console, and it used to take any
   * unsaved work with it without asking.
   *
   * These also pin down that cancelling survives the `RouterLink` wrapper the
   * logo goes through: its own comment says it "allows default navigation
   * behavior to work properly", and it does not check `defaultPrevented` the
   * way its sibling `TransitionLink` does. React Router's own `Link` checks it
   * after calling the handler, which is what makes this work.
   */
  describe('with unsaved work on screen', () => {
    let confirmSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });
    });

    afterEach(() => confirmSpy.mockRestore());

    it('asks before the logo throws it away', async () => {
      renderBrand('/admin/scores');

      await userEvent.click(screen.getByRole('link'));

      expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });

    it('stays put when the admin says no', async () => {
      confirmSpy.mockReturnValue(false);
      renderBrand('/admin/scores');

      await userEvent.click(screen.getByRole('link'));

      expect(screen.getByTestId('location')).toHaveTextContent('/admin/scores');
    });

    it('never asks while there is nothing to lose', async () => {
      clearUnsavedWork();
      renderBrand('/admin/scores');

      await userEvent.click(screen.getByRole('link'));

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });
  });
});
