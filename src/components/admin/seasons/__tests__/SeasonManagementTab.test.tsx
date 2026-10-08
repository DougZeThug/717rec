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
  }) => <button onClick={() => onEditSeason(seasons[0])}>Edit first season</button>,
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

    await user.click(screen.getByRole('button', { name: 'Edit first season' }));

    expect(screen.getByText('Editing Fall 2026')).toBeInTheDocument();
  });
});
