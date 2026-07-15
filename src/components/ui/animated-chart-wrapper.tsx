import { m } from 'framer-motion';
import React from 'react';
import { useInView } from 'react-intersection-observer';

import { cn } from '@/lib/utils';

interface AnimatedChartWrapperProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** Fades charts in (with optional delay) once they scroll into view. */
const AnimatedChartWrapper: React.FC<AnimatedChartWrapperProps> = ({
  children,
  className,
  delay = 0,
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn('size-full', className)}
    >
      {children}
    </m.div>
  );
};

export default AnimatedChartWrapper;
