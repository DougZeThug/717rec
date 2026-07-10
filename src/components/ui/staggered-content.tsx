import { m } from 'framer-motion';
import React from 'react';

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
        <m.div
          key={
            React.isValidElement(child) && child.key != null
              ? String(child.key)
              : `stagger-${index}`
          }
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: baseDelay + index * staggerDelay,
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {child}
        </m.div>
      ))}
    </div>
  );
};
