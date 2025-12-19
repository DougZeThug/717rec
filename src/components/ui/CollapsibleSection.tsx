import React, { useState, useTransition, ReactNode } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  /** If true, renders special loading/empty/error states outside the collapsible content */
  isLoading?: boolean;
  loadingContent?: ReactNode;
  isEmpty?: boolean;
  emptyContent?: ReactNode;
  error?: boolean;
  errorContent?: ReactNode;
}

export const CollapsibleSection = ({
  title,
  icon: Icon,
  iconColor = "text-blue-500",
  children,
  defaultOpen = false,
  className,
  contentClassName,
  isLoading = false,
  loadingContent,
  isEmpty = false,
  emptyContent,
  error = false,
  errorContent,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [, startTransition] = useTransition();

  const handleOpenChange = (open: boolean) => {
    startTransition(() => {
      setIsOpen(open);
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <div className={cn("border rounded-lg bg-card shadow-sm", className)}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4 md:h-5 md:w-5", iconColor)} />
            <h2 className="font-bebas text-lg md:text-xl tracking-wide uppercase bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
              {title}
            </h2>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={cn("p-3 md:p-4 pt-0 border-t", contentClassName)}>
            <div className="pt-3">
              {isLoading && loadingContent ? loadingContent : 
               error && errorContent ? errorContent :
               isEmpty && emptyContent ? emptyContent : 
               children}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}

export const SectionHeader = ({
  title,
  icon: Icon,
  iconColor = "text-blue-500",
  description,
  className,
  action,
}: SectionHeaderProps) => {
  return (
    <div className={cn("flex flex-wrap justify-between items-center mb-4 md:mb-6", className)}>
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn("h-4 w-4 md:h-5 md:w-5", iconColor)} />}
          <h2 className="text-2xl md:text-3xl font-bebas uppercase tracking-wide bg-gradient-to-r from-blue-800 via-blue-700 to-amber-700 dark:from-blue-400 dark:to-amber-400 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
};
