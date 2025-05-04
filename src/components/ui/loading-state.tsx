
import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  className = "",
  size = "md",
  fullscreen = false
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };
  
  const containerClasses = fullscreen 
    ? "min-h-screen flex items-center justify-center" 
    : "py-8 flex items-center justify-center";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center">
        <Loader2 
          className={cn("text-cornhole-navy animate-spin mb-3", sizeClasses[size])} 
        />
        <p className={cn("text-muted-foreground", {
          "text-sm": size === "sm",
          "text-base": size === "md",
          "text-lg": size === "lg",
        })}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingState;
