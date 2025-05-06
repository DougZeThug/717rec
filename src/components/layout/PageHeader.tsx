
import React, { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { typography } from "@/styles/designSystem";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  children,
  className,
  compact = false
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex flex-col",
      isMobile ? (compact ? "mb-2" : "mb-3") : "mb-6",
      "animate-fade-in-slide-down",
      className
    )}>
      <h1 className={cn(
        typography.heading.h1,
        isMobile ? "text-2xl font-medium" : "text-3xl",
        "text-gray-900 dark:text-white"
      )}>
        {title}
      </h1>
      
      {description && (
        <p className={cn(
          typography.body.default,
          "text-muted-foreground",
          isMobile ? "text-sm mt-0.5" : "text-base mt-1"
        )}>
          {description}
        </p>
      )}
      
      {children}
    </div>
  );
};

export default PageHeader;

