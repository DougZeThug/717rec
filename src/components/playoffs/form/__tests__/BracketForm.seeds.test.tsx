import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import BracketForm from '../../BracketForm';

// Title and division fill themselves in, so the only thing that can hold the
// Create button back in these tests is the seeds.
vi.mock('../BracketFormTitle', async () => {
  const { useEffect } = await import('react');
  return {
    BracketFormTitle: ({ form }: { form: { setValue: (name: string, value: string) => void } }) => {
      useEffect(() => form.setValue('title', 'Playoffs'), [form]);
      return null;
    },
  };
});

vi.mock('../BracketFormDivision', async () => {
  const { useEffect } = await import('react');
  return {
    BracketFormDivision: ({
      form,
    }: {
      form: { setValue: (name: string, value: string) => void };
    }) => {
      useEffect(() => form.setValue('divisionId', 'div1'), [form]);
      return null;
    },
  };
});

vi.mock('../BracketFormFormat', () => ({ BracketFormFormat: () => null }));
vi.mock('../BracketFormGrandFinal', () => ({ BracketFormGrandFinal: () => null }));

const TEAM_IDS = ['t1', 't2', 't3', 't4'];

vi.mock('../bracket-teams/components/BracketFormTeamsContainer', () => ({
  BracketFormTeamsContainer: ({
    onChange,
    onSeedChange,
  }: {
    onChange: (value: { ids: string[]; isValid: boolean }) => void;
    onSeedChange: (teamId: string, seed: number | null) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange({ ids: TEAM_IDS, isValid: true })}>
        pick four
      </button>
      <button type="button" onClick={() => onChange({ ids: TEAM_IDS.slice(0, 3), isValid: true })}>
        drop t4
      </button>
      <button type="button" onClick={() => onSeedChange('t1', 1)}>
        t1 seed 1
      </button>
      <button type="button" onClick={() => onSeedChange('t2', 1)}>
        t2 seed 1
      </button>
      <button type="button" onClick={() => onSeedChange('t2', 2)}>
        t2 seed 2
      </button>
      <button type="button" onClick={() => onSeedChange('t1', null)}>
        t1 clear seed
      </button>
      <button type="button" onClick={() => onSeedChange('t4', 0)}>
        t4 seed 0
      </button>
      <button type="button" onClick={() => onSeedChange('t4', 1.5)}>
        t4 seed 1.5
      </button>
      <button
        type="button"
        onClick={() => {
          for (let i = 1; i <= 8; i++) onSeedChange(`t${i}`, i);
        }}
      >
        reorder division
      </button>
      <button
        type="button"
        onClick={() => onChange({ ids: ['t5', 't6', 't7', 't8'], isValid: true })}
      >
        pick high seeds
      </button>
      <button
        type="button"
        onClick={() => {
          onSeedChange('a1', 1);
          onSeedChange('b1', 1);
          onChange({ ids: ['a1', 'b1'], isValid: true });
        }}
      >
        cross-division same seed
      </button>
    </div>
  ),
}));

const team = (id: string, division_id: string | null) => ({ id, name: id, division_id });

// a1 and b1 sit in different divisions; every other team is in division A.
const TEAMS = [
  ...['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 'a1'].map((id) => team(id, 'A')),
  team('b1', 'B'),
];

const renderForm = () => {
  const onSubmit = vi.fn();
  render(<BracketForm divisions={[]} teams={TEAMS} onSubmit={onSubmit} onCancel={vi.fn()} />);
  return { onSubmit, user: userEvent.setup() };
};

const createButton = () => screen.getByRole('button', { name: /Create Bracket/ });

describe('BracketForm manual seeds', () => {
  it('blocks a seed that is zero', async () => {
    const { user } = renderForm();
    await user.click(screen.getByText('pick four'));
    await waitFor(() => expect(createButton()).toBeEnabled());

    await user.click(screen.getByText('t4 seed 0'));

    expect(screen.getByRole('alert')).toHaveTextContent('1 or more');
    expect(createButton()).toBeDisabled();
  });

  it('blocks a seed that is not a whole number', async () => {
    const { user } = renderForm();
    await user.click(screen.getByText('pick four'));
    await waitFor(() => expect(createButton()).toBeEnabled());

    await user.click(screen.getByText('t4 seed 1.5'));

    expect(screen.getByRole('alert')).toHaveTextContent('whole numbers');
    expect(createButton()).toBeDisabled();
  });

  it('blocks two teams of the same division with the same seed', async () => {
    const { user } = renderForm();
    await user.click(screen.getByText('pick four'));
    await user.click(screen.getByText('t1 seed 1'));
    await user.click(screen.getByText('t2 seed 1'));

    expect(screen.getByRole('alert')).toHaveTextContent('same division have the same seed');
    expect(createButton()).toBeDisabled();
  });

  it('sends the seeds, and ignores a seed on a removed team', async () => {
    const { user, onSubmit } = renderForm();
    await user.click(screen.getByText('pick four'));
    await user.click(screen.getByText('t1 seed 1'));
    await user.click(screen.getByText('t2 seed 2'));
    await user.click(screen.getByText('t4 seed 0'));
    await user.click(screen.getByText('drop t4'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(createButton()).toBeEnabled());
    await user.click(createButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].teamSeeds).toEqual({ t1: 1, t2: 2 });
  });

  it('forgets a seed that is cleared, so it is not sent', async () => {
    const { user, onSubmit } = renderForm();
    await user.click(screen.getByText('pick four'));
    await user.click(screen.getByText('t1 seed 1'));
    await user.click(screen.getByText('t2 seed 2'));
    await user.click(screen.getByText('t1 clear seed'));

    await waitFor(() => expect(createButton()).toBeEnabled());
    await user.click(createButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].teamSeeds).toEqual({ t2: 2 });
  });

  it('tells the admin the bracket is ready and says BYEs will be added for an odd count', async () => {
    const { user } = renderForm();
    await user.click(screen.getByText('drop t4'));

    expect(screen.getByText(/Ready to create bracket with 3 teams/)).toHaveTextContent(
      'BYEs will be added'
    );
  });

  // Manage Seeds carries division seeds (1 to the division size), not bracket
  // positions, so a partial or cross-division bracket must still be creatable.
  describe('division seeds from Manage Seeds', () => {
    it('allows a partial bracket of lower-ranked teams (seeds above the team count)', async () => {
      const { user, onSubmit } = renderForm();
      await user.click(screen.getByText('reorder division'));
      await user.click(screen.getByText('pick high seeds'));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await waitFor(() => expect(createButton()).toBeEnabled());
      await user.click(createButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].teamSeeds).toEqual({ t5: 5, t6: 6, t7: 7, t8: 8 });
    });

    it('allows a cross-division bracket where two teams are each seed 1', async () => {
      const { user, onSubmit } = renderForm();
      await user.click(screen.getByText('cross-division same seed'));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await waitFor(() => expect(createButton()).toBeEnabled());
      await user.click(createButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit.mock.calls[0][0].teamSeeds).toEqual({ a1: 1, b1: 1 });
    });
  });
});
