import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { errorLog } from '@/utils/logger';

import { BracketCreationErrorBoundary } from '../BracketCreationErrorBoundary';

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
}));

let shouldThrow = true;

// A child that throws until the test flips the flag, to trip and then reset the boundary.
const Boom = ({ message }: { message: string }): React.ReactElement => {
  if (shouldThrow) throw new Error(message);
  return <p>form is back</p>;
};

describe('BracketCreationErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    shouldThrow = true;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('renders the form when nothing fails', () => {
    shouldThrow = false;
    render(
      <BracketCreationErrorBoundary>
        <Boom message="unused" />
      </BracketCreationErrorBoundary>
    );

    expect(screen.getByText('form is back')).toBeInTheDocument();
  });

  it('explains a missing-teams failure with suggested fixes', () => {
    render(
      <BracketCreationErrorBoundary>
        <Boom message="no teams found" />
      </BracketCreationErrorBoundary>
    );

    expect(screen.getByText('Bracket Creation Error')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load teams/)).toBeInTheDocument();
    expect(screen.getByText('Suggested fixes:')).toBeInTheDocument();
    expect(screen.getByText('Add teams to your divisions first')).toBeInTheDocument();
  });

  it('explains a divisions failure with suggested fixes', () => {
    render(
      <BracketCreationErrorBoundary>
        <Boom message="could not load divisions" />
      </BracketCreationErrorBoundary>
    );

    expect(screen.getByText(/Failed to load divisions/)).toBeInTheDocument();
    expect(
      screen.getByText('Ensure at least one division exists in your database')
    ).toBeInTheDocument();
    expect(screen.getByText('Check database connectivity')).toBeInTheDocument();
  });

  it('shows the raw message and no fix list for an unknown failure', () => {
    render(
      <BracketCreationErrorBoundary>
        <Boom message="something odd" />
      </BracketCreationErrorBoundary>
    );

    expect(screen.getByText('Error: something odd')).toBeInTheDocument();
    expect(screen.queryByText('Suggested fixes:')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Debug Info' })).not.toBeInTheDocument();
  });

  it('retries the form and calls onReset when Try Again is clicked', async () => {
    const onReset = vi.fn();
    render(
      <BracketCreationErrorBoundary onReset={onReset}>
        <Boom message="network down" />
      </BracketCreationErrorBoundary>
    );
    shouldThrow = false;

    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('form is back')).toBeInTheDocument();
  });

  it('logs the full error from the Debug Info button in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(
      <BracketCreationErrorBoundary>
        <Boom message="validation failed" />
      </BracketCreationErrorBoundary>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Debug Info' }));

    expect(errorLog).toHaveBeenCalledWith(
      'Full error details:',
      expect.objectContaining({ message: 'validation failed' }),
      expect.anything()
    );
  });
});
