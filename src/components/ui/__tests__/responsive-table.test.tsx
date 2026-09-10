import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { expectNoAxeViolations } from '@/test/a11y';

/**
 * `ResponsiveTable` exists so that a table has one definition of its columns
 * and two renderings of them — a real table on a computer, a stack of cards on
 * a phone. Before it, the app had four different answers to "what does this
 * table do on a small screen", and one of them was "scroll sideways".
 *
 * What these tests are protecting:
 *
 *  - **Card mode must not be a table.** The rejected alternative was CSS
 *    `::before` labels on one DOM, but stacking cells needs `display:block`,
 *    which strips the table role — and with it the `scope` on every heading,
 *    on exactly the devices most members use.
 *  - **A heading and its card label are the same string.** That is the whole
 *    reason columns are data rather than JSX, so a test that reads the label
 *    off the card is testing the thing that stops the two drifting apart.
 *
 * See L3 in `docs/audits/UX-AUDIT-2026-09.md`.
 */

interface Team {
  id: string;
  name: string;
  power: number;
  division: string;
}

const columns: ResponsiveTableColumn<Team>[] = [
  { id: 'name', header: 'Team', card: 'title', cell: (t) => t.name },
  { id: 'power', header: 'Power', cell: (t) => t.power },
  { id: 'division', header: 'Division', card: 'hidden', cell: (t) => t.division },
];

const rows: Team[] = [
  { id: 'a', name: 'Ringers', power: 84.8, division: 'Competitive' },
  { id: 'b', name: 'Cornstars', power: 71.2, division: 'Intermediate' },
];

const renderTable = (mode: 'table' | 'cards', override?: Partial<{ rows: Team[] }>) =>
  render(
    <ResponsiveTable
      mode={mode}
      caption="Season standings"
      columns={columns}
      rows={override?.rows ?? rows}
      rowKey={(t) => t.id}
      empty={<p>No teams yet</p>}
    />
  );

describe('ResponsiveTable in table mode', () => {
  it('renders one column heading per column, each scoped', () => {
    renderTable('table');

    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['Team', 'Power', 'Division']);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });

  it('renders a header row plus one row per item', () => {
    renderTable('table');
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
  });

  it('names the table for a screen reader without showing the name', () => {
    renderTable('table');
    expect(screen.getByRole('table', { name: 'Season standings' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderTable('table');
    await expectNoAxeViolations(container);
  });
});

describe('ResponsiveTable in card mode', () => {
  it('is a labelled list, not a table', () => {
    renderTable('cards');

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Season standings' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(rows.length);
  });

  it('labels each value with its column heading', () => {
    renderTable('cards');

    const firstCard = within(screen.getByRole('list')).getAllByRole('listitem')[0];
    // The heading text is reused verbatim as the card label — that is the point.
    expect(within(firstCard).getByText('Power')).toBeInTheDocument();
    expect(within(firstCard).getByText('84.8')).toBeInTheDocument();
  });

  it('shows the title column with no label, and drops hidden columns', () => {
    renderTable('cards');

    const firstCard = within(screen.getByRole('list')).getAllByRole('listitem')[0];
    expect(within(firstCard).getByText('Ringers')).toBeInTheDocument();
    expect(within(firstCard).queryByText('Team')).not.toBeInTheDocument();
    expect(within(firstCard).queryByText('Division')).not.toBeInTheDocument();
    expect(within(firstCard).queryByText('Competitive')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderTable('cards');
    await expectNoAxeViolations(container);
  });
});

describe('ResponsiveTable with no rows', () => {
  it.each(['table', 'cards'] as const)('shows the empty state instead of %s', (mode) => {
    renderTable(mode, { rows: [] });

    expect(screen.getByText('No teams yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
