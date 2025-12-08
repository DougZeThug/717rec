import React from 'react';
import { Card } from "@/components/ui/card";
import { ShimmerSkeleton, AvatarSkeleton } from "@/components/ui/shimmer-skeleton";
import { motion } from "framer-motion";

interface TeamListSkeletonProps {
  viewMode: 'grid' | 'list';
}

export const TeamListSkeleton: React.FC<TeamListSkeletonProps> = ({ viewMode }) => {
  const skeletonCount = 3;
  const skeletons = Array.from({ length: skeletonCount }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {skeletons.map((index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Card className="bg-card border-border rounded-xl shadow-md overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-[150px] h-[150px] bg-muted/50 flex items-center justify-center">
                  <AvatarSkeleton size="lg" />
                </div>
                <div className="flex flex-col flex-grow p-4 space-y-4">
                  <div className="flex justify-between">
                    <ShimmerSkeleton className="h-6 w-1/3" />
                    <ShimmerSkeleton className="h-6 w-8" />
                  </div>
                  <ShimmerSkeleton className="h-5 w-1/4" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="bg-muted/30 p-2 rounded space-y-1">
                        <ShimmerSkeleton className="h-3 w-1/2" />
                        <ShimmerSkeleton className="h-4 w-2/3" />
                      </div>
                    ))}
                  </div>
                  <ShimmerSkeleton className="h-3 w-3/4 mt-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  // Grid view skeleton
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {skeletons.map((index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <Card className="bg-card border-border rounded-xl shadow-md overflow-hidden h-[220px] flex flex-col">
            <ShimmerSkeleton className="h-24 w-full rounded-none" />
            <div className="p-4 space-y-3 flex-grow">
              <div className="flex justify-between">
                <ShimmerSkeleton className="h-5 w-2/3" />
                <ShimmerSkeleton className="h-5 w-6" />
              </div>
              <ShimmerSkeleton className="h-4 w-1/4" />
              <div className="grid grid-cols-2 gap-2">
                <ShimmerSkeleton className="h-14 w-full" />
                <ShimmerSkeleton className="h-14 w-full" />
              </div>
              <ShimmerSkeleton className="h-3 w-full mt-auto" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
