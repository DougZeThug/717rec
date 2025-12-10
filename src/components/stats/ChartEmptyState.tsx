import React from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartEmptyStateProps {
  message?: string;
  className?: string;
}

const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({ 
  message = "No data available yet",
  className 
}) => {
  return (
    <div className={cn(
      "w-full h-[180px] rounded-xl overflow-hidden flex flex-col items-center justify-center gap-2",
      "bg-muted/30 border border-dashed border-muted-foreground/20",
      className
    )}>
      <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground/60 font-inter">
        {message}
      </p>
    </div>
  );
};

export default ChartEmptyState;
