import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BracketErrorBoundary from '../BracketErrorBoundary';

// A child that always throws, to trip the error boundary.
const Boom = (): React.ReactElement => {
  throw new Error('kaboom');
};

describe('BracketErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs boundary-caught errors to console.error; silence for clean output.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children and does not show fallback when there is no error', () => {
    render(
      <BracketErrorBoundary>
        <p>bracket content</p>
      </BracketErrorBoundary>
    );

    expect(screen.getByText('bracket content')).toBeInTheDocument();
  });

  it('renders the fallback UI with bracket context when an error is thrown', () => {
    render(
      <BracketErrorBoundary bracketId="bracket-123">
        <Boom />
      </BracketErrorBoundary>
    );

    // Fallback UI is shown instead of the crashed children.
    expect(screen.getByText('Bracket Rendering Error')).toBeInTheDocument();
    expect(screen.getByText(/Bracket ID: bracket-123/)).toBeInTheDocument();
  });
});
