import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile }));

import TeamsTable from '../TeamsTable';

/**
 * `TeamsTable` replaced `TeamTableDesktop` and `TeamListMobile`, which held a
 * character-for-character identical avatar and a division select differing
 * only by width — and which disagreed about their breakpoint (`sm:` against
 * the admin shell's `md:`, audit A-15). One component renders both now, so the
 * breakpoint lives only in `useIsMobile()`. See L3 in
 * `docs/audits/UX-AUDIT-2026-09.md`.
 */
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const team = (overrides: Partial<Team> = {}) =>
  ({
    id: 'team-1',
    name: 'Ringers',
    division_id: 'div-1',
    logoUrl: null,
    imageUrl: null,
    ...overrides,
  }) as unknown as Team;

const divisions = [
  { id: 'div-1', name: 'Competitive' },
  { id: 'div-2', name: 'Intermediate' },
];

const setup = (teams: Team[] = [team()]) => {
  const actions = {
    onEdit: vi.fn(),
    onDivisionChange: vi.fn(),
    isUpdatingTeam: vi.fn().mockReturnValue(false),
  };
  render(<TeamsTable teams={teams} divisions={divisions} actions={actions} />);
  return actions;
};

describe('TeamsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
  });

  it('gives every column a scoped heading', () => {
    setup();

    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Team', 'Division', 'Actions']);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });

  it('falls back to an icon when a team has no logo', () => {
    setup();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Ringers')).toBeInTheDocument();
  });

  it('shows the logo when a team has one', () => {
    setup([team({ logoUrl: 'https://example.test/ringers.png' })]);
    expect(screen.getByRole('img', { name: 'Ringers' })).toBeInTheDocument();
  });

  it('names the division control after its team, so a screen reader can tell them apart', () => {
    setup([team(), team({ id: 'team-2', name: 'Cornstars' })]);

    expect(screen.getByRole('combobox', { name: 'Set division for Ringers' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Set division for Cornstars' })
    ).toBeInTheDocument();
  });

  it('locks the division control while that team is saving', () => {
    const actions = {
      onEdit: vi.fn(),
      onDivisionChange: vi.fn(),
      isUpdatingTeam: vi.fn().mockReturnValue(true),
    };
    render(<TeamsTable teams={[team()]} divisions={divisions} actions={actions} />);

    expect(screen.getByRole('combobox', { name: 'Set division for Ringers' })).toBeDisabled();
  });

  it('opens the editor for the team whose button was pressed', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Edit Ringers' }));

    expect(actions.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'team-1' }));
  });

  it('becomes a labelled list of cards on a phone, not a table', () => {
    mockIsMobile = true;
    setup([team(), team({ id: 'team-2', name: 'Cornstars' })]);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Teams and their divisions' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    // The division control keeps working in card mode.
    expect(
      within(list).getByRole('combobox', { name: 'Set division for Ringers' })
    ).toBeInTheDocument();
  });
});
