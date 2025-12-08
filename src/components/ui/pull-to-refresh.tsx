
import React, { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  className,
  threshold = 80
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const y = useMotionValue(0);
  const controls = useAnimation();
  
  const opacity = useTransform(y, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const rotate = useTransform(y, [0, threshold], [0, 180]);
  const scale = useTransform(y, [0, threshold / 2, threshold], [0.5, 0.8, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      y.set(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const diff = Math.max(0, (currentY.current - startY.current) * 0.5);
    
    if (diff > 0) {
      y.set(Math.min(diff, threshold * 1.5));
    }
  }, [isRefreshing, y, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;
    
    const pullDistance = y.get();
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      await controls.start({ y: threshold / 2 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        await controls.start({ y: 0 });
        y.set(0);
      }
    } else {
      await controls.start({ y: 0 });
      y.set(0);
    }
  }, [isRefreshing, y, threshold, controls, onRefresh]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ 
          y: useTransform(y, (val) => val - 50),
          opacity 
        }}
      >
        <motion.div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "bg-primary/10 dark:bg-primary/20"
          )}
          style={{ scale }}
        >
          <motion.div style={{ rotate }}>
            <RefreshCw 
              className={cn(
                "w-5 h-5 text-primary",
                isRefreshing && "animate-spin"
              )} 
            />
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* Content */}
      <motion.div
        style={{ y }}
        animate={controls}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
