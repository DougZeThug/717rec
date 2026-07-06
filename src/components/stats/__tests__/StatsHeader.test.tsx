import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Division } from '@/types';

import StatsHeader from '../StatsHeader';

const divisions = [
  { id: 'div-1', name: 'Competitive' },
  { id: 'div-2', name: 'Recreational' },
] as Division[];

describe('StatsHeader', () => {
  const onDivisionChange = vi.fn();

  beforeEach(() => {
    onDivisionChange.mockReset();
  });

  it('renders the page title', () => {
    render(<StatsHeader onDivisionChange={onDivisionChange} divisions={divisions} />);
    expect(screen.getByText('Team Statistics')).toBeInTheDocument();
  });

  it('defaults the filter to All Divisions', () => {
    render(<StatsHeader onDivisionChange={onDivisionChange} divisions={divisions} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('All Divisions');
  });

  it('lists every division as a selectable option', async () => {
    render(<StatsHeader onDivisionChange={onDivisionChange} divisions={divisions} />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByRole('option', { name: 'All Divisions' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Competitive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Recreational' })).toBeInTheDocument();
  });

  it('calls onDivisionChange with the division id when one is picked', async () => {
    render(<StatsHeader onDivisionChange={onDivisionChange} divisions={divisions} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Competitive' }));

    expect(onDivisionChange).toHaveBeenCalledWith('div-1');
  });

  it('renders without divisions', () => {
    render(<StatsHeader onDivisionChange={onDivisionChange} divisions={[]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
