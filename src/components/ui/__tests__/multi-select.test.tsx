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

  it('clears every pick from the X without opening the list', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(['t1']);

    const combobox = screen.getByRole('combobox');
    const clear = combobox.querySelector('svg.lucide-x') as SVGElement;
    await user.click(clear);

    expect(onChange).toHaveBeenCalledWith([]);
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });
});
