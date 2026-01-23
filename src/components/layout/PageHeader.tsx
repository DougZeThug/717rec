import React, { ReactNode } from 'react';

import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { typeScale } from '@/styles/design-system';
import { blueAmberHeading } from '@/styles/design-system/blueAmber';

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  withGradient?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  children,
  className,
  compact = false,
  withGradient = true,
}) => {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'flex flex-col',
        isMobile ? (compact ? 'mb-2' : 'mb-3') : 'mb-6',
        'animate-fade-in-slide-down',
        className
      )}
    >
      <h1
        className={cn(
          typeScale.h1,
          isMobile && 'text-[24px] leading-[28px]',
          withGradient ? blueAmberHeading() : 'text-foreground'
        )}
      >
        {title}
      </h1>

      {description && (
        <p className={cn(typeScale.body, 'text-muted-foreground mt-1')}>{description}</p>
      )}

      {children}
    </div>
  );
};

export default PageHeader;
