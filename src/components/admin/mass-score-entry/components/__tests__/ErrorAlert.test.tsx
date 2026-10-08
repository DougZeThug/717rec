import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ErrorAlert from '../ErrorAlert';

describe('ErrorAlert', () => {
  it('shows a plain message with Retry and Dismiss', async () => {
    const onRetry = vi.fn();
    const onClear = vi.fn();
    const user = userEvent.setup();

    render(<ErrorAlert message="Could not load matches" onRetry={onRetry} onClear={onClear} />);

    expect(screen.getByText('Could not load matches')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when no match failed', () => {
    const { container } = render(<ErrorAlert failedMatches={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('summarises saved and failed matches and retries only the failed ones', async () => {
    const onRetryFailed = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorAlert failedMatches={['m1', 'm2']} savedCount={3} onRetryFailed={onRetryFailed} />
    );

    expect(screen.getByText('3 saved, 2 failed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Retry failed/ }));
    expect(onRetryFailed).toHaveBeenCalledTimes(1);
  });

  it('uses the singular when one match failed to update', () => {
    render(<ErrorAlert failedMatches={['m1']} />);

    expect(screen.getByText('1 match failed to update.')).toBeInTheDocument();
  });

  it('shows and hides the reason for each failed match', async () => {
    const user = userEvent.setup();

    render(
      <ErrorAlert failedMatches={['m1', 'm2']} errorMessages={{ m1: 'Scores must be different' }} />
    );

    expect(screen.queryByText('Scores must be different')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show details' }));
    expect(screen.getByText('Scores must be different')).toBeInTheDocument();
    expect(screen.getByText('Could not save this match — try again.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(screen.queryByText('Scores must be different')).not.toBeInTheDocument();
  });
});
