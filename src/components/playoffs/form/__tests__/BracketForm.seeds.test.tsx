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
      <button type="button" onClick={() => onSeedChange('t4', 99)}>
        t4 seed 99
      </button>
    </div>
  ),
}));

const renderForm = () => {
  const onSubmit = vi.fn();
  render(<BracketForm divisions={[]} teams={[]} onSubmit={onSubmit} onCancel={vi.fn()} />);
  return { onSubmit, user: userEvent.setup() };
};

const createButton = () => screen.getByRole('button', { name: /Create Bracket/ });

describe('BracketForm manual seeds', () => {
  it('blocks a seed larger than the team count', async () => {
    const { user } = renderForm();
    await user.click(screen.getByText('pick four'));
    await waitFor(() => expect(createButton()).toBeEnabled());

    await user.click(screen.getByText('t4 seed 99'));

    expect(screen.getByRole('alert')).toHaveTextContent('from 1 to 4');
    expect(createButton()).toBeDisabled();
  });

  it('blocks two teams with the same seed', async () => {
    const { user } = renderForm();
    await user.click(screen.getByText('pick four'));
    await user.click(screen.getByText('t1 seed 1'));
    await user.click(screen.getByText('t2 seed 1'));

    expect(screen.getByRole('alert')).toHaveTextContent('same seed');
    expect(createButton()).toBeDisabled();
  });

  it('sends unique in-range seeds, and ignores a seed on a removed team', async () => {
    const { user, onSubmit } = renderForm();
    await user.click(screen.getByText('pick four'));
    await user.click(screen.getByText('t1 seed 1'));
    await user.click(screen.getByText('t2 seed 2'));
    await user.click(screen.getByText('t4 seed 99'));
    await user.click(screen.getByText('drop t4'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(createButton()).toBeEnabled());
    await user.click(createButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].teamSeeds).toEqual({ t1: 1, t2: 2 });
  });
});
