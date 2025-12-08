import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedRankNumberProps {
  rank: number;
  previousRank?: number;
  showFlash?: boolean;
}

export const AnimatedRankNumber: React.FC<AnimatedRankNumberProps> = ({
  rank,
  previousRank,
  showFlash = true,
}) => {
  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null);
  
  const getRankStyles = (index: number) => {
    if (index === 1) return "bg-amber-100 text-amber-800 font-bold dark:bg-amber-900/50 dark:text-amber-300"; // Gold
    if (index === 2) return "bg-slate-100 text-slate-700 font-bold dark:bg-slate-800 dark:text-slate-300"; // Silver
    if (index === 3) return "bg-orange-100 text-orange-800 font-bold dark:bg-orange-900/50 dark:text-orange-300"; // Bronze
    return "bg-muted text-muted-foreground";
  };

  useEffect(() => {
    if (previousRank && previousRank !== rank && showFlash) {
      // Rank improved (lower number = better rank)
      if (rank < previousRank) {
        setFlashColor("green");
      } else if (rank > previousRank) {
        setFlashColor("red");
      }
      
      const timer = setTimeout(() => setFlashColor(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [rank, previousRank, showFlash]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={rank}
          initial={{ scale: 0.8, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 10 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            duration: 0.3 
          }}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
            getRankStyles(rank),
            flashColor === "green" && "ring-2 ring-green-500 ring-offset-1",
            flashColor === "red" && "ring-2 ring-red-500 ring-offset-1"
          )}
        >
          {rank}
        </motion.div>
      </AnimatePresence>
      
      {/* Flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={cn(
              "absolute inset-0 rounded-full pointer-events-none",
              flashColor === "green" ? "bg-green-500" : "bg-red-500"
            )}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedRankNumber;
