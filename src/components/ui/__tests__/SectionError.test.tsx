import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BusinessLogicError } from '@/types/errors';

import { SectionError } from '../SectionError';

describe('SectionError', () => {
  it('names what did not load and gives a safe reason, not the raw error text', () => {
    render(
      <SectionError
        title="Team of the Week"
        error={new Error('relation "x" missing')}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Team of the Week could not load');
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/relation/)).not.toBeInTheDocument();
  });

  it('shows an authored reason from a typed error', () => {
    render(
      <SectionError
        title="Weekly recap"
        error={new BusinessLogicError('No games yet')}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText('No games yet')).toBeInTheDocument();
  });

  it('retries only that section', () => {
    const onRetry = vi.fn();
    render(<SectionError title="Weekly recap" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
