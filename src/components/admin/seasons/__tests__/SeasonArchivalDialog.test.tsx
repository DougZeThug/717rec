import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Season } from '@/types/season';

const toastMock = vi.fn();
const archiveMock = vi.fn().mockResolvedValue(undefined);
const partialArchiveMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/useSeasonMutations', () => ({
  useSeasonMutations: () => ({
    archiveSeason: { mutateAsync: archiveMock },
    partialArchiveSeason: { mutateAsync: partialArchiveMock },
  }),
}));

import SeasonArchivalDialog from '../SeasonArchivalDialog';

const season: Season = {
  id: 's-1',
  name: 'Spring 2026',
  is_active: true,
  is_archived: false,
  playoffs_active: false,
  start_date: '2026-01-01',
  end_date: null,
  created_at: '2026-01-01T00:00:00Z',
  champion_team_id: null,
  runner_up_team_id: null,
};

describe('SeasonArchivalDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets the "Keep playoffs active" checkbox each time the dialog reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SeasonArchivalDialog isOpen onClose={vi.fn()} season={season} />
    );

    let checkbox = screen.getByRole('checkbox', { name: /keep playoffs active/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    checkbox = screen.getByRole('checkbox', { name: /keep playoffs active/i });
    expect(checkbox).toBeChecked();

    // Close, then reopen the dialog (component stays mounted across cycles)
    rerender(<SeasonArchivalDialog isOpen={false} onClose={vi.fn()} season={season} />);
    rerender(<SeasonArchivalDialog isOpen onClose={vi.fn()} season={season} />);

    checkbox = screen.getByRole('checkbox', { name: /keep playoffs active/i });
    expect(checkbox).not.toBeChecked();
  });
});
