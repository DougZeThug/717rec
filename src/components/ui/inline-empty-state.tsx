import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface InlineEmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
  className?: string;
}

/**
 * Compact empty state for tables, lists, and smaller contexts
 * Use EmptyState for full-page/card empty states
 */
const InlineEmptyState: React.FC<InlineEmptyStateProps> = ({
  icon: Icon,
  message,
  description,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 px-4 text-center",
        className
      )}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 border border-border/50 mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
};

export { InlineEmptyState };
export type { InlineEmptyStateProps };
