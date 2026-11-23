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

  it('lets the caller replace the empty line, keeping Create Bracket below it', () => {
    render(
      <DivisionBracketsCard
        division="Intermediate"
        brackets={[]}
        onViewBracket={vi.fn()}
        onCreateBracket={vi.fn()}
        emptyStateSlot={<p>Projected seeds go here</p>}
      />
    );

    expect(screen.getByText('Projected seeds go here')).toBeInTheDocument();
    expect(screen.queryByText('No brackets yet for this division')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create bracket/i })).toBeInTheDocument();
  });

  it('ignores the slot when the division already has a bracket', () => {
    render(
      <DivisionBracketsCard
        division="Intermediate"
        brackets={[bracket('live', 'in_progress')]}
        onViewBracket={vi.fn()}
        emptyStateSlot={<p>Projected seeds go here</p>}
      />
    );

    expect(screen.queryByText('Projected seeds go here')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Live Bracket' })).toBeInTheDocument();
  });

  describe('a bracket made with the older tool', () => {
    const LEGACY_NOTE =
      'This bracket was made with an older tool and cannot be drawn. Its results are saved.';

    it('shows a note instead of the View button and keeps the Legacy badge', () => {
      render(
        <DivisionBracketsCard
          division="Intermediate"
          brackets={[{ ...bracket('old', 'completed'), uses_brackets_manager: false }]}
          onViewBracket={vi.fn()}
        />
      );

      expect(screen.getByText(LEGACY_NOTE)).toBeInTheDocument();
      expect(screen.getByText('Legacy')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument();
    });

    it('still lets an admin delete it', async () => {
      const onDeleteBracket = vi.fn();
      render(
        <DivisionBracketsCard
          division="Intermediate"
          brackets={[{ ...bracket('old', 'in_progress'), uses_brackets_manager: false }]}
          onViewBracket={vi.fn()}
          onDeleteBracket={onDeleteBracket}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(onDeleteBracket).toHaveBeenCalledWith('old', 'Bracket old');
    });

    it('leaves a brackets-manager bracket with its button and no note', () => {
      render(
        <DivisionBracketsCard
          division="Intermediate"
          brackets={[bracket('live', 'in_progress')]}
          onViewBracket={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'View Live Bracket' })).toBeInTheDocument();
      expect(screen.queryByText(LEGACY_NOTE)).not.toBeInTheDocument();
      expect(screen.queryByText('Legacy')).not.toBeInTheDocument();
    });

    it('keeps the button when the row has no brackets-manager flag at all', () => {
      const { uses_brackets_manager: _flag, ...withoutFlag } = bracket('unknown', 'in_progress');
      render(
        <DivisionBracketsCard
          division="Intermediate"
          brackets={[withoutFlag]}
          onViewBracket={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'View Live Bracket' })).toBeInTheDocument();
      expect(screen.queryByText(LEGACY_NOTE)).not.toBeInTheDocument();
    });
  });
});
