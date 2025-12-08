import React from "react";
import { Card } from "@/components/ui/card";
import { ShimmerSkeleton, AvatarSkeleton } from "@/components/ui/shimmer-skeleton";
import { motion } from "framer-motion";

const MatchCardSkeleton = ({ index = 0 }: { index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <Card className="group relative overflow-hidden border-border bg-card">
        <div className="p-6">
          {/* Teams and Logos */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <AvatarSkeleton size="md" />
              <ShimmerSkeleton className="ml-3 w-24 h-5" />
            </div>
            <ShimmerSkeleton className="mx-2 w-8 h-6" />
            <div className="flex items-center">
              <ShimmerSkeleton className="mr-3 w-24 h-5" />
              <AvatarSkeleton size="md" />
            </div>
          </div>
          
          {/* Match Info */}
          <div className="flex justify-between text-sm mt-4">
            <div className="space-y-2">
              <ShimmerSkeleton className="w-28 h-4" />
              <ShimmerSkeleton className="w-24 h-4" />
            </div>
            <div className="space-y-2">
              <ShimmerSkeleton className="w-16 h-4 ml-auto" />
              <ShimmerSkeleton className="w-12 h-4 ml-auto" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const RecentMatchesSkeleton: React.FC = () => {
  return (
    <section id="recent-matches-skeleton" className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((index) => (
          <MatchCardSkeleton key={index} index={index} />
        ))}
      </div>
    </section>
  );
};

export default RecentMatchesSkeleton;
