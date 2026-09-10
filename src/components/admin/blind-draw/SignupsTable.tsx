import React from 'react';

import { cn } from '@/lib/utils';

const HEADER_CELL = 'text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium';

/** Padding for a body cell, so rows line up with the headings above them. */
export const SIGNUPS_CELL = 'px-2 sm:px-4 py-2';

/**
 * The frame for the blind-draw signups list: the border, the table, and the
 * four headings. Callers supply only the rows.
 *
 * The real list and its loading skeleton used to write this header out
 * separately, character for character — so a column added to one silently did
 * not appear in the other, and the skeleton stopped matching what it was
 * standing in for. React Doctor flagged the pair as a duplicated JSX subtree.
 *
 * It stays a plain `<table>` rather than `ResponsiveTable`: three visible
 * columns on a phone (the date folds under the name) already read fine, and a
 * card per signup would be more chrome for less information. See
 * `src/docs/TABLE_PATTERNS.md`.
 */
/** The four headings, kept out of the table body so neither tree nests deeply. */
const SignupsTableHeader: React.FC = () => (
  <thead className="bg-muted/50">
    <tr>
      <th scope="col" className={cn(HEADER_CELL, 'w-8')}>
        #
      </th>
      <th scope="col" className={HEADER_CELL}>
        Name
      </th>
      <th scope="col" className={cn(HEADER_CELL, 'hidden sm:table-cell')}>
        Signed Up
      </th>
      <th scope="col" aria-label="Actions" className={cn(HEADER_CELL, 'text-right w-12')} />
    </tr>
  </thead>
);

const SignupsTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border rounded-lg overflow-hidden">
    <table className="w-full">
      <SignupsTableHeader />
      <tbody className="divide-y">{children}</tbody>
    </table>
  </div>
);

export default SignupsTable;
