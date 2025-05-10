
import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface StatBlockProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  icon?: React.ReactNode;
  gradient?: string;
}

export const StatBlock: React.FC<StatBlockProps> = ({ 
  label, 
  value, 
  className = "",
  orientation = 'vertical',
  icon,
  gradient = "bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30 dark:from-gray-800/80 dark:to-gray-900/80"
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  const baseClasses = cn(
    gradient, 
    "p-3 rounded-lg text-left transition-all duration-200 hover:shadow-md border",
    isLight ? "border-gray-200" : "border-gray-700/50"
  );
  
  const labelClasses = "font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400";
  const valueClasses = "font-mono text-base font-medium text-[#2c2c2c] dark:text-white";

  if (orientation === 'horizontal') {
    return (
      <div className={`${baseClasses} flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-600 dark:text-gray-300">{icon}</span>}
          <span className={labelClasses}>{label}</span>
        </div>
        <span className={valueClasses}>{value}</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} flex flex-col ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-gray-600 dark:text-gray-300">{icon}</span>}
        <span className={labelClasses}>{label}</span>
      </div>
      <div className={`${valueClasses} text-center text-lg`}>{value}</div>
    </div>
  );
};
