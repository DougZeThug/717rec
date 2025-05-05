
import React, { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
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
      className
    )}>
      <h1 className={cn(
        "font-oswald uppercase tracking-wide text-gray-900 dark:text-white",
        isMobile ? "text-2xl font-medium" : "text-3xl font-semibold"
      )}>
        {title}
      </h1>
      
      {description && (
        <p className={cn(
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
