import React from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { ShimmerSkeleton, CardSkeleton } from "@/components/ui/shimmer-skeleton";

const StatsLoadingState: React.FC = () => {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <BarChart3 className="h-8 w-8 text-muted-foreground animate-pulse" />
          <ShimmerSkeleton className="h-8 w-48" />
        </motion.div>

        {/* Stats cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <CardSkeleton hasActions />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsLoadingState;
