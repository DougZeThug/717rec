import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Season } from '@/types/season';

const mockSetConfirmationMutate = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSeasonMutations', () => ({
  useSeasonMutations: () => ({
    setSeasonConfirmationOpen: { mutate: mockSetConfirmationMutate, isPending: false },
  }),
}));

vi.mock('@/hooks/useToast', () => ({ toast: (payload: unknown) => mockToast(payload) }));

vi.mock('../SeasonArchivalDialog', () => ({
  default: () => null,
}));

import SeasonActions from '../SeasonActions';

const season: Season = {
  id: 's-1',
  name: 'Fall 2026',
  is_active: true,
  is_archived: false,
  playoffs_active: false,
  created_at: '2026-01-01T00:00:00Z',
  confirmation_open: false,
};

describe('SeasonActions confirmation switch', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens confirmation for the season when switched on', async () => {
    const user = userEvent.setup();
    render(<SeasonActions season={season} />);

    const toggle = screen.getByRole('switch', { name: /open for confirmation/i });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    await waitFor(() =>
      expect(mockSetConfirmationMutate).toHaveBeenCalledWith(
        { id: 's-1', open: true },
        expect.anything()
      )
    );
  });

  it('reflects a season that is already open, and closes it', async () => {
    const user = userEvent.setup();
    render(<SeasonActions season={{ ...season, confirmation_open: true }} />);

    const toggle = screen.getByRole('switch', { name: /open for confirmation/i });
    expect(toggle).toBeChecked();

    await user.click(toggle);

    await waitFor(() =>
      expect(mockSetConfirmationMutate).toHaveBeenCalledWith(
        { id: 's-1', open: false },
        expect.anything()
      )
    );
  });

  it('treats a season with no flag selected as closed', () => {
    const { confirmation_open: _omitted, ...withoutFlag } = season;
    render(<SeasonActions season={withoutFlag} />);

    expect(screen.getByRole('switch', { name: /open for confirmation/i })).not.toBeChecked();
  });
});
