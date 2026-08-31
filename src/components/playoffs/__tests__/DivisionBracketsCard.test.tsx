import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DivisionBracketsCard from '../DivisionBracketsCard';

vi.mock('@/utils/logger', () => ({ bracketLog: vi.fn() }));

const bracket = (id: string, state: string) => ({
  id,
  name: `Bracket ${id}`,
  format: 'Double Elimination',
  state: state as 'pending' | 'in_progress' | 'completed',
  uses_brackets_manager: true,
});

describe('DivisionBracketsCard', () => {
  it('marks a completed bracket and points its button at the final results', () => {
    render(
      <DivisionBracketsCard
        division="Intermediate"
        brackets={[bracket('done', 'completed')]}
        onViewBracket={vi.fn()}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Final Results' })).toBeInTheDocument();
    expect(screen.queryByText('No brackets yet for this division')).not.toBeInTheDocument();
  });

  it('leaves an in-progress bracket unbadged', () => {
    render(
      <DivisionBracketsCard
        division="Intermediate"
        brackets={[bracket('live', 'in_progress')]}
        onViewBracket={vi.fn()}
      />
    );

    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Live Bracket' })).toBeInTheDocument();
  });

  it('offers Create Bracket when the division already has one', async () => {
    const onCreateBracket = vi.fn();
    render(
      <DivisionBracketsCard
        division="Intermediate"
        brackets={[bracket('live', 'in_progress')]}
        onViewBracket={vi.fn()}
        onCreateBracket={onCreateBracket}
      />
    );

    // A division can hold more than one bracket, so this is the route to a
    // second one. It used to exist only in the empty state.
    await userEvent.click(screen.getByRole('button', { name: /create bracket/i }));

    expect(onCreateBracket).toHaveBeenCalledTimes(1);
  });

  it('offers Create Bracket when the division has none', () => {
    render(
      <DivisionBracketsCard
        division="Intermediate"
        brackets={[]}
        onViewBracket={vi.fn()}
        onCreateBracket={vi.fn()}
      />
    );

    expect(screen.getByText('No brackets yet for this division')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create bracket/i })).toBeInTheDocument();
  });
});
