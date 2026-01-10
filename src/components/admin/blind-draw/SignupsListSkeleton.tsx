import React from 'react';

import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';

/**
 * Skeleton for BlindDrawSignupsTab table
 * Matches the table structure: # | Name | Signed Up | Action
 */
const SignupsListSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium w-8">#</th>
            <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">Name</th>
            <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium hidden sm:table-cell">
              Signed Up
            </th>
            <th className="text-right px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {[1, 2, 3, 4, 5].map((index) => (
            <tr key={index}>
              <td className="px-2 sm:px-4 py-2">
                <ShimmerSkeleton className="h-4 w-4" />
              </td>
              <td className="px-2 sm:px-4 py-2">
                <ShimmerSkeleton className="h-4 w-24" />
              </td>
              <td className="px-2 sm:px-4 py-2 hidden sm:table-cell">
                <ShimmerSkeleton className="h-4 w-28" />
              </td>
              <td className="px-2 sm:px-4 py-2 text-right">
                <ShimmerSkeleton circle className="h-8 w-8 ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SignupsListSkeleton;
