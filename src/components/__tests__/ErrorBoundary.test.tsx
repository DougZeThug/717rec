import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from '../ErrorBoundary';

const mockCaptureError = vi.fn();

vi.mock('@/utils/sentry', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

// Simple child that throws on demand so the boundary can catch it.
const Bomb = ({ message = 'Boom' }: { message?: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  // React logs caught errors to console.error; silence it to keep test output clean.
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: vi.fn(), href: originalLocation.href },
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
    (window.location.reload as ReturnType<typeof vi.fn>).mockClear?.();
    window.location.href = originalLocation.href;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders the default fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh Page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Home/i })).toBeInTheDocument();
  });

  it('renders a custom fallback when one is provided', () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('reports the caught error to Sentry via captureError', () => {
    render(
      <ErrorBoundary>
        <Bomb message="Explosion" />
      </ErrorBoundary>
    );

    expect(mockCaptureError).toHaveBeenCalledTimes(1);
    const [error, context] = mockCaptureError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Explosion');
    expect(context).toHaveProperty('componentStack');
  });

  it('shows the error message in the fallback (DEV build)', () => {
    render(
      <ErrorBoundary>
        <Bomb message="Detailed dev message" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Detailed dev message')).toBeInTheDocument();
  });

  it('reloads the page when "Refresh Page" is clicked', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    screen.getByRole('button', { name: /Refresh Page/i }).click();
    expect(window.location.reload).toHaveBeenCalledTimes(1);
  });

  it('navigates home when "Go Home" is clicked', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    screen.getByRole('button', { name: /Go Home/i }).click();
    expect(window.location.href).toBe('/');
  });
});
