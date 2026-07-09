import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamPlayerRow } from '@/services/liveScoring/dbTypes';

import { PlayerSelector } from '../PlayerSelector';

const player = (id: string, name: string): TeamPlayerRow => ({
  id,
  team_id: 'team-1',
  display_name: name,
  profile_id: null,
  is_active: true,
  created_at: '',
});

const roster = [player('p1', 'Doug'), player('p2', 'Bill'), player('p3', 'Sara')];

const onChange = vi.fn();
const onAddPlayer = vi.fn();

const renderSelector = (selectedIds: string[] = []) =>
  render(
    <PlayerSelector
      teamName="Baggers"
      roster={roster}
      selectedIds={selectedIds}
      onChange={onChange}
      onAddPlayer={onAddPlayer}
      isAddingPlayer={false}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlayerSelector', () => {
  it('shows the selected players on the trigger button', () => {
    renderSelector(['p1', 'p2']);
    expect(screen.getByRole('button', { name: 'Doug & Bill' })).toBeInTheDocument();
  });

  it('selects a player from the roster', async () => {
    renderSelector([]);
    await userEvent.click(screen.getByRole('button', { name: /select players/i }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Doug' }));

    expect(onChange).toHaveBeenCalledWith(['p1']);
  });

  it('enforces the 2-player limit by disabling further checkboxes', async () => {
    renderSelector(['p1', 'p2']);
    await userEvent.click(screen.getByRole('button', { name: 'Doug & Bill' }));

    expect(await screen.findByRole('checkbox', { name: 'Sara' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Doug' })).toBeEnabled();
  });

  it('deselects a checked player', async () => {
    renderSelector(['p1']);
    await userEvent.click(screen.getByRole('button', { name: 'Doug' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Doug' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('adds a new player by name', async () => {
    renderSelector([]);
    await userEvent.click(screen.getByRole('button', { name: /select players/i }));
    await userEvent.type(await screen.findByLabelText('New player name'), 'New Guy');
    await userEvent.click(screen.getByRole('button', { name: 'Add player' }));

    expect(onAddPlayer).toHaveBeenCalledWith('New Guy');
  });
});
