
import React from 'react';
import { Card } from "@/components/ui/card";

interface TeamListSkeletonProps {
  viewMode: 'grid' | 'list';
}

export const TeamListSkeleton: React.FC<TeamListSkeletonProps> = ({ viewMode }) => {
  const skeletonCount = 3;
  const skeletons = Array.from({ length: skeletonCount }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-4 animate-pulse">
        {skeletons.map((index) => (
          <Card key={index} className="bg-[#1E1E1E] rounded-xl shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-[150px] h-[150px] bg-black/40 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gray-700"></div>
              </div>
              <div className="flex flex-col flex-grow p-4 space-y-4">
                <div className="flex justify-between">
                  <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-700 rounded w-8"></div>
                </div>
                <div className="h-5 bg-gray-700 rounded w-1/4"></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-black/30 p-2 rounded">
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                  </div>
                  <div className="bg-black/30 p-2 rounded">
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                  </div>
                  <div className="bg-black/30 p-2 rounded">
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                  </div>
                  <div className="bg-black/30 p-2 rounded">
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="h-3 bg-gray-700 rounded w-3/4 mt-4"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Grid view skeleton
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
      {skeletons.map((index) => (
        <Card key={index} className="bg-[#1E1E1E] rounded-xl shadow-md overflow-hidden h-[220px] flex flex-col">
          <div className="h-24 bg-black/40"></div>
          <div className="p-4 space-y-3 flex-grow">
            <div className="flex justify-between">
              <div className="h-5 bg-gray-700 rounded w-2/3"></div>
              <div className="h-5 bg-gray-700 rounded w-6"></div>
            </div>
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/30 p-1.5 rounded h-14"></div>
              <div className="bg-black/30 p-1.5 rounded h-14"></div>
            </div>
            <div className="h-3 bg-gray-700 rounded w-full mt-auto"></div>
          </div>
        </Card>
      ))}
    </div>
  );
};
