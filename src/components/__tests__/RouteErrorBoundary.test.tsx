import { onlineManager } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteErrorBoundary } from '../RouteErrorBoundary';

const mockCaptureError = vi.fn();

vi.mock('@/utils/sentry', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

/** Throws on demand so the boundary has something to catch. */
const Bomb = ({ message }: { message: string }) => {
  throw new Error(message);
};

const CHUNK_FAILURE = 'Failed to fetch dynamically imported module: /assets/Stats-a1b2c3.js';

describe('RouteErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalLocation = window.location;

  beforeAll(() => {
    // The recovery panel reloads the document once the connection is back.
    // jsdom cannot navigate, so stand in for it.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: vi.fn() },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    onlineManager.setOnline(true);
  });

  it('renders the page when nothing goes wrong', () => {
    render(
      <RouteErrorBoundary routeName="Standings">
        <p>Standings</p>
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Standings')).toBeInTheDocument();
  });

  it('names the page it could not load, for an ordinary error', () => {
    render(
      <RouteErrorBoundary routeName="Standings">
        <Bomb message="Cannot read properties of undefined" />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /failed to load standings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
  });

  it('reports an ordinary error with its route', () => {
    render(
      <RouteErrorBoundary routeName="Standings">
        <Bomb message="Cannot read properties of undefined" />
      </RouteErrorBoundary>
    );

    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ routeName: 'Standings' })
    );
  });

  it('shows the offline recovery panel when the page never downloaded', () => {
    onlineManager.setOnline(false);

    render(
      <RouteErrorBoundary routeName="Standings">
        <Bomb message={CHUNK_FAILURE} />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /did not download/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /failed to load standings/i })).toBeNull();
  });

  it('does not report a failed page download as a crash', () => {
    onlineManager.setOnline(false);

    render(
      <RouteErrorBoundary routeName="Standings">
        <Bomb message={CHUNK_FAILURE} />
      </RouteErrorBoundary>
    );

    expect(mockCaptureError).not.toHaveBeenCalled();
  });

  // The app-level boundary sits above <Suspense> in AppLayout and never
  // unmounts. Without resetKey one page that failed to download latched the
  // recovery panel on for the rest of the visit: every link changed the URL
  // and left the same panel on screen until the reader reloaded by hand.
  it('clears the recovery panel when the reader moves to another page', () => {
    onlineManager.setOnline(false);

    const { rerender } = render(
      <RouteErrorBoundary routeName="this page" resetKey="/stats">
        <Bomb message={CHUNK_FAILURE} />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /did not download/i })).toBeInTheDocument();

    // The next page's code did arrive, so the boundary must render it.
    rerender(
      <RouteErrorBoundary routeName="this page" resetKey="/schedule">
        <p>Schedule</p>
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /did not download/i })).toBeNull();
  });

  // Measured, not assumed: React Router renders route elements without a key,
  // so a per-route boundary is the same element type at the same position after
  // navigation and React keeps the instance. These latched too.
  it('clears a per-route boundary when the route behind it changes', () => {
    const { rerender } = render(
      <RouteErrorBoundary routeName="Standings">
        <Bomb message="Cannot read properties of undefined" />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /failed to load standings/i })).toBeInTheDocument();

    rerender(
      <RouteErrorBoundary routeName="Teams">
        <p>Teams</p>
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /failed to load/i })).toBeNull();
  });

  it('keeps the error on screen while the reader stays on the same page', () => {
    const { rerender } = render(
      <RouteErrorBoundary routeName="Standings" resetKey="/stats">
        <Bomb message="Cannot read properties of undefined" />
      </RouteErrorBoundary>
    );

    // An unrelated re-render must not quietly swallow a real crash.
    rerender(
      <RouteErrorBoundary routeName="Standings" resetKey="/stats">
        <p>Standings</p>
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /failed to load standings/i })).toBeInTheDocument();
    expect(screen.queryByText('Standings')).toBeNull();
  });

  it('renders the page again when Try Again is pressed and the retry succeeds', async () => {
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) throw new Error('transient');
      return <p>Standings</p>;
    };

    render(
      <RouteErrorBoundary routeName="Standings">
        <Flaky />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /failed to load standings/i })).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Standings')).toBeInTheDocument();
  });
});
