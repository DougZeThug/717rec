import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useRef } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';

import { RouteFocusManager } from '../RouteFocusManager';

const Harness: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate('/standings')}>
        standings
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      <main ref={mainRef} id="main-content" tabIndex={-1} data-testid="main">
        <Routes>
          <Route path="/" element={<h1>Home</h1>} />
          <Route path="/standings" element={<h1>Standings</h1>} />
        </Routes>
        <RouteFocusManager mainRef={mainRef} />
      </main>
    </>
  );
};

describe('RouteFocusManager', () => {
  it('does not move focus on initial render', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>
    );

    expect(screen.getByTestId('main')).not.toHaveFocus();
  });

  it('moves focus to the main landmark after PUSH navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'standings' }));

    await waitFor(() => {
      expect(screen.getByTestId('main')).toHaveFocus();
    });
  });

  it('does not steal focus after POP navigation', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>
    );

    const standingsButton = screen.getByRole('button', { name: 'standings' });
    await user.click(standingsButton);
    await waitFor(() => expect(screen.getByTestId('main')).toHaveFocus());

    const backButton = screen.getByRole('button', { name: 'back' });
    backButton.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument());
    expect(screen.getByTestId('main')).not.toHaveFocus();
    expect(backButton).toHaveFocus();
  });
});
