import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Season } from '@/types/season';

let seasonsFromHook: Season[] = [];

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => ({ data: seasonsFromHook, isLoading: false }),
}));

vi.mock('../SeasonActions', () => ({
  default: ({ season }: { season: Season }) => <div>Actions for {season.name}</div>,
}));

vi.mock('../SeasonForm', () => ({
  default: ({ season, onClose }: { season?: Season; onClose: () => void }) => (
    <div>
      <span>{season ? `Editing ${season.name}` : 'New season form'}</span>
      {/* Uncontrolled, like the real form's state: it keeps what was typed unless remounted. */}
      <input aria-label="Season name" defaultValue={season?.name ?? ''} />
      <button onClick={onClose}>Close form</button>
    </div>
  ),
}));

vi.mock('../SeasonsList', () => ({
  default: ({
    seasons,
    onEditSeason,
  }: {
    seasons: Season[];
    onEditSeason: (season: Season) => void;
  }) => (
    <>
      {seasons.map((s) => (
        <button key={s.id} onClick={() => onEditSeason(s)}>
          Edit {s.name}
        </button>
      ))}
    </>
  ),
}));

import SeasonManagementTab from '../SeasonManagementTab';

const makeSeason = (overrides: Partial<Season> = {}): Season => ({
  id: 's-1',
  name: 'Spring 2026',
  is_active: false,
  is_archived: false,
  playoffs_active: false,
  start_date: '2026-01-01',
  end_date: null,
  created_at: '2026-01-01T00:00:00Z',
  champion_team_id: null,
  runner_up_team_id: null,
  ...overrides,
});

describe('SeasonManagementTab', () => {
  beforeEach(() => {
    seasonsFromHook = [];
  });

  it('shows empty overview cards when there are no seasons', () => {
    render(<SeasonManagementTab />);

    expect(screen.getByText('Active Season')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('0 archived')).toBeInTheDocument();
    expect(screen.getByText('Ready to activate')).toBeInTheDocument();
    expect(screen.queryByText(/Actions for/)).not.toBeInTheDocument();
  });

  it('counts the active, archived and inactive seasons in the overview cards', () => {
    seasonsFromHook = [
      makeSeason({ id: 's-live', name: 'Spring 2026', is_active: true }),
      makeSeason({ id: 's-idle', name: 'Summer 2026' }),
      makeSeason({ id: 's-old', name: 'Winter 2025', is_archived: true }),
    ];
    render(<SeasonManagementTab />);

    expect(screen.getByText('Total Seasons')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1 archived')).toBeInTheDocument();
    expect(screen.getByText('Inactive Seasons')).toBeInTheDocument();
    expect(screen.getByText('Actions for Spring 2026')).toBeInTheDocument();
  });

  it('opens the create form, then closes it', async () => {
    const user = userEvent.setup();
    render(<SeasonManagementTab />);

    await user.click(screen.getByRole('button', { name: /Create New Season/ }));
    expect(screen.getByText('New season form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close form' }));
    expect(screen.queryByText('New season form')).not.toBeInTheDocument();
  });

  it('opens the form for the season picked in the list', async () => {
    const user = userEvent.setup();
    seasonsFromHook = [makeSeason({ name: 'Fall 2026' })];
    render(<SeasonManagementTab />);

    await user.click(screen.getByRole('button', { name: 'Edit Fall 2026' }));

    expect(screen.getByText('Editing Fall 2026')).toBeInTheDocument();
  });

  // The form keeps its own state, so without a key it carried one season's
  // typing into the next: the edit overwrote the wrong season, or a create
  // reused the previous values.
  it('resets the form when another season is picked for editing', async () => {
    const user = userEvent.setup();
    seasonsFromHook = [
      makeSeason({ id: 's-1', name: 'Fall 2026' }),
      makeSeason({ id: 's-2', name: 'Winter 2026' }),
    ];
    render(<SeasonManagementTab />);

    await user.click(screen.getByRole('button', { name: 'Edit Fall 2026' }));
    await user.type(screen.getByLabelText('Season name'), ' typo');
    expect(screen.getByLabelText('Season name')).toHaveValue('Fall 2026 typo');

    await user.click(screen.getByRole('button', { name: 'Edit Winter 2026' }));

    expect(screen.getByText('Editing Winter 2026')).toBeInTheDocument();
    expect(screen.getByLabelText('Season name')).toHaveValue('Winter 2026');
  });

  it('starts a create form empty after editing a season', async () => {
    const user = userEvent.setup();
    seasonsFromHook = [makeSeason({ name: 'Fall 2026' })];
    render(<SeasonManagementTab />);

    await user.click(screen.getByRole('button', { name: 'Edit Fall 2026' }));
    await user.click(screen.getByRole('button', { name: /Create New Season/ }));

    expect(screen.getByText('New season form')).toBeInTheDocument();
    expect(screen.getByLabelText('Season name')).toHaveValue('');
  });
});
