import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureError } from '@/utils/sentry';

import BracketErrorBoundary from '../BracketErrorBoundary';

vi.mock('@/utils/sentry', () => ({
  captureError: vi.fn(),
}));

// A child that always throws, to trip the error boundary.
const Boom = (): React.ReactElement => {
  throw new Error('kaboom');
};

describe('BracketErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(captureError).mockClear();
    // React logs boundary-caught errors to console.error; silence for clean output.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children and does not report when there is no error', () => {
    render(
      <BracketErrorBoundary>
        <p>bracket content</p>
      </BracketErrorBoundary>
    );

    expect(screen.getByText('bracket content')).toBeInTheDocument();
    expect(captureError).not.toHaveBeenCalled();
  });

  it('renders the fallback UI and reports the error to Sentry with bracket context', () => {
    render(
      <BracketErrorBoundary bracketId="bracket-123">
        <Boom />
      </BracketErrorBoundary>
    );

    // Fallback UI is shown instead of the crashed children.
    expect(screen.getByText('Bracket Rendering Error')).toBeInTheDocument();
    expect(screen.getByText(/Bracket ID: bracket-123/)).toBeInTheDocument();

    // Sentry received the error plus bracket context (matches ErrorBoundary/RouteErrorBoundary).
    expect(captureError).toHaveBeenCalledTimes(1);
    const [reportedError, context] = vi.mocked(captureError).mock.calls[0];
    expect(reportedError).toBeInstanceOf(Error);
    expect((reportedError as Error).message).toBe('kaboom');
    expect(context).toMatchObject({ bracketId: 'bracket-123' });
    expect(context).toHaveProperty('componentStack');
  });
});
