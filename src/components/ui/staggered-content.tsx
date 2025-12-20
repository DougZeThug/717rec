import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Priority = "high" | "medium" | "low";

interface StaggerItemProps {
  priority?: Priority;
  children: React.ReactNode;
  className?: string;
}

const priorityDelays: Record<Priority, number> = {
  high: 0,
  medium: 0.1,
  low: 0.2,
};

/**
 * Individual item that appears with staggered timing
 * Priority determines delay: high=instant, medium=100ms, low=200ms
 */
export const StaggerItem: React.FC<StaggerItemProps> = ({
  priority = "medium",
  children,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: priorityDelays[priority],
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggeredContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container for staggered content reveal
 * Wraps children with StaggerItem for coordinated animations
 */
export const StaggeredContent: React.FC<StaggeredContentProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("contents", className)}>
      {children}
    </div>
  );
};

/**
 * Auto-stagger children without explicit priority assignment
 * Each child gets incrementally delayed by 50ms
 */
export const AutoStagger: React.FC<{
  children: React.ReactNode;
  baseDelay?: number;
  staggerDelay?: number;
  className?: string;
}> = ({ children, baseDelay = 0, staggerDelay = 0.05, className }) => {
  const childArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: baseDelay + index * staggerDelay,
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
};

export { StaggeredContent as default };
