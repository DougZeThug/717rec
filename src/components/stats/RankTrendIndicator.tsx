import React, { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { debugLog } from "@/utils/logger";
import { cn } from "@/lib/utils";

interface RankTrendIndicatorProps {
  rankChange?: number;
}

const RankTrendIndicator: React.FC<RankTrendIndicatorProps> = ({ rankChange }) => {
  const [showFlash, setShowFlash] = useState(false);

  // Add debug info to component
  useEffect(() => {
    if (rankChange !== undefined && rankChange !== 0) {
      debugLog(`Rendering trend indicator with change: ${rankChange}`);
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [rankChange]);

  // Handle undefined, null, or 0 cases
  if (rankChange === undefined || rankChange === null) {
    return (
      <div className="flex items-center">
        <Minus size={14} className="text-gray-400" />
        <span className="text-gray-400 ml-0.5 text-xs">-</span>
      </div>
    );
  } else if (rankChange === 0) {
    return (
      <div className="flex items-center">
        <Minus size={14} className="text-gray-500" />
        <span className="text-gray-500 ml-0.5 text-xs font-medium">0</span>
      </div>
    );
  } else if (rankChange > 0) {
    // Positive change means team moved up in rankings
    return (
      <motion.div 
        className={cn(
          "flex items-center text-green-600 dark:text-green-400 relative",
          showFlash && "animate-pulse"
        )}
        initial={{ scale: 1 }}
        animate={showFlash ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {showFlash && (
            <motion.div
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-green-500/30 rounded-full -z-10"
            />
          )}
        </AnimatePresence>
        <TrendingUp size={14} />
        <span className="ml-0.5 text-xs font-medium">+{rankChange}</span>
      </motion.div>
    );
  } else {
    // Negative change means team moved down in rankings
    return (
      <motion.div 
        className={cn(
          "flex items-center text-red-600 dark:text-red-400 relative",
          showFlash && "animate-pulse"
        )}
        initial={{ scale: 1 }}
        animate={showFlash ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {showFlash && (
            <motion.div
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-red-500/30 rounded-full -z-10"
            />
          )}
        </AnimatePresence>
        <TrendingDown size={14} />
        <span className="ml-0.5 text-xs font-medium">{rankChange}</span>
      </motion.div>
    );
  }
};

export default RankTrendIndicator;
