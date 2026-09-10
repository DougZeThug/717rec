import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SignupsListSkeleton from '../SignupsListSkeleton';
import SignupsTable from '../SignupsTable';

/**
 * The signups list and its loading skeleton used to write the same four
 * headings out separately, character for character. A column added to one
 * silently did not appear in the other, and the skeleton stopped standing in
 * for the thing it was standing in for. React Doctor flagged the pair as a
 * duplicated JSX subtree on PR #1394.
 *
 * They share `SignupsTable` now. These tests are what keeps that true: the
 * headings are asserted once, and the skeleton is asserted to show the same
 * ones — so the two can only drift apart by making this file fail.
 */
const HEADINGS = ['#', 'Name', 'Signed Up'];

describe('SignupsTable', () => {
  it('gives the list its four column headings, all scoped', () => {
    render(
      <SignupsTable>
        <tr>
          <td>1</td>
          <td>Casey W.</td>
          <td>Sep 4, 7:02 pm</td>
          <td>remove</td>
        </tr>
      </SignupsTable>
    );

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }

    for (const heading of HEADINGS) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument();
    }
    // The actions column shows nothing, so its name has to come from aria-label.
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('renders the rows it is given', () => {
    render(
      <SignupsTable>
        <tr>
          <td>1</td>
          <td>Casey W.</td>
          <td>Sep 4, 7:02 pm</td>
          <td>remove</td>
        </tr>
      </SignupsTable>
    );

    expect(screen.getByText('Casey W.')).toBeInTheDocument();
  });
});

describe('SignupsListSkeleton', () => {
  it('shows the same headings the loaded list will show', () => {
    render(<SignupsListSkeleton />);

    for (const heading of [...HEADINGS, 'Actions']) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument();
    }
  });

  it('stands in for five rows', () => {
    render(<SignupsListSkeleton />);
    // One header row plus five placeholders.
    expect(screen.getAllByRole('row')).toHaveLength(6);
  });
});
