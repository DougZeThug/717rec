import React from 'react';

import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

import SignupsTable, { SIGNUPS_CELL } from './SignupsTable';

const SKELETON_ROWS = [
  'signup-skel-1',
  'signup-skel-2',
  'signup-skel-3',
  'signup-skel-4',
  'signup-skel-5',
];

/**
 * Loading state for the blind-draw signups list.
 *
 * It borrows the real list's frame rather than copying it, so the headings it
 * shows are the headings the loaded table will show.
 */
const SignupsListSkeleton: React.FC = () => (
  <SignupsTable>
    {SKELETON_ROWS.map((rowKey) => (
      <tr key={rowKey}>
        <td className={SIGNUPS_CELL}>
          <ShimmerSkeleton className="size-4" />
        </td>
        <td className={SIGNUPS_CELL}>
          <ShimmerSkeleton className="h-4 w-24" />
        </td>
        <td className={`${SIGNUPS_CELL} hidden sm:table-cell`}>
          <ShimmerSkeleton className="h-4 w-28" />
        </td>
        <td className={`${SIGNUPS_CELL} text-right`}>
          <ShimmerSkeleton circle className="size-8 ml-auto" />
        </td>
      </tr>
    ))}
  </SignupsTable>
);

export default SignupsListSkeleton;
