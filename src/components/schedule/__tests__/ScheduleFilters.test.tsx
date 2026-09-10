import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { buildDivisionOptions } from '@/utils/schedule/matchFilters';

import { ScheduleFilters } from '../ScheduleFilters';

const options = buildDivisionOptions([
  { id: 'a', name: 'Competitive High', display_division: 'Competitive', division_weight: 3 },
  { id: 'b', name: 'Intermediate', display_division: 'Intermediate', division_weight: 2 },
]);

const onDivisionChange = vi.fn();
const onTeamChange = vi.fn();

const renderFilters = (props: Partial<React.ComponentProps<typeof ScheduleFilters>> = {}) =>
  render(
    <ScheduleFilters
      options={options}
      division="all"
      onDivisionChange={onDivisionChange}
      team="all"
      onTeamChange={onTeamChange}
      showMyTeam
      {...props}
    />
  );

describe('ScheduleFilters', () => {
  it('offers All plus one chip per division', () => {
    renderFilters();

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Competitive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intermediate' })).toBeInTheDocument();
  });

  it('says which chip is on, so it is not colour alone', () => {
    renderFilters({ division: 'intermediate' });

    expect(screen.getByRole('button', { name: 'Intermediate' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to All for a division the league does not have', () => {
    renderFilters({ division: 'hyperbolic' });

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports the division that was tapped', async () => {
    renderFilters();

    await userEvent.click(screen.getByRole('button', { name: 'Intermediate' }));

    expect(onDivisionChange).toHaveBeenCalledWith('intermediate');
  });

  it('turns My team on and off again', async () => {
    const { rerender } = renderFilters();

    await userEvent.click(screen.getByRole('button', { name: /my team/i }));
    expect(onTeamChange).toHaveBeenLastCalledWith('mine');

    rerender(
      <ScheduleFilters
        options={options}
        division="all"
        onDivisionChange={onDivisionChange}
        team="mine"
        onTeamChange={onTeamChange}
        showMyTeam
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /my team/i }));
    expect(onTeamChange).toHaveBeenLastCalledWith('all');
  });

  it('hides My team from anyone with no team to filter to', () => {
    renderFilters({ showMyTeam: false });

    expect(screen.queryByRole('button', { name: /my team/i })).not.toBeInTheDocument();
  });

  it('renders nothing at all when there is nothing to offer', () => {
    const { container } = renderFilters({ options: [], showMyTeam: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('still offers My team when the divisions could not be read', () => {
    renderFilters({ options: [] });

    expect(screen.getByRole('button', { name: /my team/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
  });
});
