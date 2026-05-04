import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Division } from '@/types';

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

import TeamsDisplayModeToggle from '../TeamsDisplayModeToggle';
import { TeamsFilters } from '../TeamsFilters';
import TeamsSortToggle from '../TeamsSortToggle';

describe('Teams controls', () => {
  it('changes sort mode', async () => {
    const setSortMode = vi.fn();
    render(<TeamsSortToggle sortMode="rank" setSortMode={setSortMode} />);
    await userEvent.click(screen.getByRole('button', { name: 'A–Z' }));
    expect(setSortMode).toHaveBeenCalledWith('alpha');
  });

  it('toggles display mode', async () => {
    const onDisplayModeChange = vi.fn();
    render(<TeamsDisplayModeToggle displayMode="all" onDisplayModeChange={onDisplayModeChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /view teams by division/i }));
    expect(onDisplayModeChange).toHaveBeenCalledWith('grouped');
  });

  it('changes division filter', async () => {
    const onDivisionChange = vi.fn();
    const divisions: Division[] = [{ id: 'd1', name: 'Alpha' } as Division];
    render(
      <TeamsFilters
        selectedDivision="all"
        onDivisionChange={onDivisionChange}
        divisions={divisions}
      />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Alpha'));
    expect(onDivisionChange).toHaveBeenCalledWith('d1');
  });
});
