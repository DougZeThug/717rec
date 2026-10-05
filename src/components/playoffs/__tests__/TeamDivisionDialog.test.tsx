import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import TeamDivisionDialog from '../TeamDivisionDialog';

vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));

const team = (
  id: string,
  name: string,
  divisionName: string,
  logoUrl: string | null = null
): Team => ({
  id,
  name,
  divisionName,
  logoUrl,
});

const onTeamDivisionChange = vi.fn();
const onOpenChange = vi.fn();

const renderDialog = (teamsByDivision: Record<string, Team[]>, teamsLoading = false) =>
  render(
    <TeamDivisionDialog
      open
      onOpenChange={onOpenChange}
      teamsByDivision={teamsByDivision}
      availableDivisions={['Competitive', 'Intermediate']}
      teamsLoading={teamsLoading}
      onTeamDivisionChange={onTeamDivisionChange}
    />
  );

describe('TeamDivisionDialog', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a spinner, not the divisions, while the teams load', () => {
    renderDialog({}, true);

    expect(document.body.querySelector('svg.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Competitive Division')).not.toBeInTheDocument();
  });

  it('lists each division with its teams, and a name for every division picker', () => {
    renderDialog({
      Competitive: [team('t1', 'Tigers', 'Competitive', 'https://img.test/tigers.png')],
      Intermediate: [team('t2', 'Lions', 'Intermediate')],
    });

    expect(screen.getByText('Competitive Division')).toBeInTheDocument();
    expect(screen.getByText('Intermediate Division')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tigers' })).toBeInTheDocument();
    expect(screen.getByText('No Logo')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Division for Tigers' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Division for Lions' })).toBeInTheDocument();
  });

  it('moves a team that already has a division into another one', async () => {
    const user = userEvent.setup();
    renderDialog({ Competitive: [team('t1', 'Tigers', 'Competitive')] });

    await user.click(screen.getByRole('combobox', { name: 'Division for Tigers' }));
    await user.click(await screen.findByRole('option', { name: 'Intermediate' }));

    expect(onTeamDivisionChange).toHaveBeenCalledWith('t1', 'Intermediate');
  });

  it('lists unassigned teams apart, and moves one into a division', async () => {
    const user = userEvent.setup();
    renderDialog({
      Competitive: [],
      Unassigned: [team('t3', 'Bears', 'Unassigned')],
    });

    expect(screen.getByText('Unassigned Teams')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Division for Bears' }));
    const listbox = await screen.findByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['Competitive', 'Intermediate', 'Unassigned']);
    await user.click(within(listbox).getByRole('option', { name: 'Intermediate' }));

    expect(onTeamDivisionChange).toHaveBeenCalledWith('t3', 'Intermediate');
  });

  it('hides the unassigned list when every team has a division', () => {
    renderDialog({ Competitive: [team('t1', 'Tigers', 'Competitive')] });

    expect(screen.queryByText('Unassigned Teams')).not.toBeInTheDocument();
  });

  it('closes when Done is pressed', async () => {
    const user = userEvent.setup();
    renderDialog({});

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
