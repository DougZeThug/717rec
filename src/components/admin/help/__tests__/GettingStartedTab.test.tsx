import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminSectionGuide } from '../adminSectionGuide';
import GettingStartedTab from '../GettingStartedTab';

const mockSwitchAdminTab = vi.fn();

vi.mock('@/utils/adminTabs', () => ({
  switchAdminTab: (...args: unknown[]) => mockSwitchAdminTab(...args),
}));

const renderTab = () =>
  render(
    <MemoryRouter>
      <GettingStartedTab />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GettingStartedTab', () => {
  it('opens the section a workflow step names', async () => {
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: /Set Up Timeslots/ }));

    expect(mockSwitchAdminTab).toHaveBeenCalledWith('timeslots');
  });

  // The step used to print the internal id, so it read "batch-matches" rather
  // than the name on the menu the admin has to find.
  it('names the target section the way the sidebar does', () => {
    renderTab();

    const step = screen.getByRole('button', { name: /Generate Schedule/ });
    expect(step).toHaveTextContent('Auto Schedule');
    expect(step).not.toHaveTextContent('auto-schedule');
  });

  // Step 6 pointed at Match Creation. Playoffs are run from the playoffs page.
  it('sends "Run Playoffs" to the playoffs page', () => {
    renderTab();

    const step = screen.getByRole('link', { name: /Run Playoffs/ });
    expect(step).toHaveAttribute('href', '/playoffs');
  });

  it('lists every admin section and opens the one that is pressed', async () => {
    renderTab();

    for (const section of adminSectionGuide) {
      expect(screen.getByText(section.description)).toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole('button', { name: /Power Score Sandbox/ }));
    expect(mockSwitchAdminTab).toHaveBeenCalledWith('power-sandbox');
  });
});
