import React from 'react';

import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

interface ResponsiveChartContainerProps {
  children: React.ReactNode;
  className?: string;
  heightMobile?: number;
  heightDesktop?: number;
  width?: string | number;
  title?: string;
  description?: string;
}

export const ResponsiveChartContainer: React.FC<ResponsiveChartContainerProps> = ({
  children,
  className,
  heightMobile = 220,
  heightDesktop = 300,
  width = '100%',
  title,
  description,
}) => {
  const isMobile = useIsMobile();
  const height = isMobile ? heightMobile : heightDesktop;

  return (
    <div className={cn('rounded-xl overflow-hidden', className)}>
      {(title || description) && (
        <div className="p-3 pb-1">
          {title && <h3 className="text-base font-semibold">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}

      <div
        style={{
          height,
          width,
          maxHeight: '90vh',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ResponsiveChartContainer;
