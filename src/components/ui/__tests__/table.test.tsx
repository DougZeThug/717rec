import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { expectNoAxeViolations } from '@/test/a11y';

/**
 * `<th scope="col">` is what tells a screen reader that a heading names a
 * column. Without it the standings table reads as a wall of numbers with
 * nothing saying which one is Power and which is Win %.
 *
 * Fifteen tables across the app relied on each author remembering to write it,
 * and only three did. `TableHead` supplies it now, so the callers do not have
 * to — these tests are what keeps that true. See L3 in
 * `docs/audits/UX-AUDIT-2026-09.md`.
 */
describe('TableHead scope', () => {
  it('declares itself a column heading without being asked', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead>Power</TableHead>
          </tr>
        </thead>
      </table>
    );

    expect(screen.getByRole('columnheader', { name: 'Power' })).toHaveAttribute('scope', 'col');
  });

  it('lets a caller ask for a row heading instead', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableHead scope="row">Ringers</TableHead>
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByRole('rowheader', { name: 'Ringers' })).toHaveAttribute('scope', 'row');
  });
});

describe('Table', () => {
  const renderStandings = () =>
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead>Power</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ringers</TableCell>
            <TableCell>84.8</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

  it('gives every heading a scope, so no caller has to remember', () => {
    renderStandings();

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = renderStandings();
    await expectNoAxeViolations(container);
  });
});
