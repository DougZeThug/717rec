import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { MultiSelect } from '@/components/ui/multi-select';

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
});

const options = [
  { value: 't1', label: 'Tigers' },
  { value: 't2', label: 'Lions' },
];

const setup = (selected: string[] = []) => {
  const onChange = vi.fn();
  render(<MultiSelect options={options} selected={selected} onChange={onChange} />);
  return { onChange };
};

describe('MultiSelect', () => {
  it('shows the placeholder when nothing is picked', () => {
    setup();
    expect(screen.getByRole('combobox')).toHaveTextContent('Select items...');
  });

  it('counts the picked teams', () => {
    setup(['t1', 't2']);
    expect(screen.getByRole('combobox')).toHaveTextContent('2 teams selected');
  });

  it('adds a team when its row is clicked', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(['t1']);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Lions'));

    expect(onChange).toHaveBeenCalledWith(['t1', 't2']);
  });

  it('removes a team that is already picked', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(['t1', 't2']);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Tigers'));

    expect(onChange).toHaveBeenCalledWith(['t2']);
  });

  it('filters the list from the search box and says when nothing matches', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('combobox'));
    await user.type(await screen.findByLabelText('Search teams'), 'zzz');

    expect(await screen.findByText('No teams found.')).toBeInTheDocument();
  });

  describe('two teams with the same name', () => {
    const twins = [
      { value: 'id-1', label: 'Falcons' },
      { value: 'id-2', label: 'Lions' },
      { value: 'id-3', label: 'Falcons' },
    ];

    const openTwins = async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<MultiSelect options={twins} selected={[]} onChange={onChange} />);
      await user.click(screen.getByRole('combobox'));
      await user.type(await screen.findByLabelText('Search teams'), 'Falcons');
      return { user, onChange };
    };

    it('lets the keyboard reach the second one', async () => {
      const { user, onChange } = await openTwins();

      await user.keyboard('{ArrowDown}{Enter}');

      expect(onChange).toHaveBeenCalledWith(['id-3']);
    });

    it('highlights only one of them at a time', async () => {
      await openTwins();

      const listbox = await screen.findByRole('listbox');
      expect(listbox.querySelectorAll('[cmdk-item]')).toHaveLength(2);
      expect(listbox.querySelectorAll('[cmdk-item][aria-selected="true"]')).toHaveLength(1);
    });
  });

  it('searches the team name, not the id behind it', async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect
        options={[
          { value: 'zzz-1', label: 'Tigers' },
          { value: 'zzz-2', label: 'Lions' },
        ]}
        selected={[]}
        onChange={vi.fn()}
      />
    );
    await user.click(screen.getByRole('combobox'));
    const search = await screen.findByLabelText('Search teams');

    await user.type(search, 'zzz');
    expect(await screen.findByText('No teams found.')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'lion');
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.queryByText('Tigers')).not.toBeInTheDocument();
  });

  it('clears every pick from the X without opening the list', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(['t1']);

    const combobox = screen.getByRole('combobox');
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(onChange).toHaveBeenCalledWith([]);
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('clears from the keyboard with Tab then Enter', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(['t1']);

    await user.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear selection' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows no clear button when nothing is selected', () => {
    setup([]);
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
  });
});
