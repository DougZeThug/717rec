
import React from "react";

interface StatBlockProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  icon?: React.ReactNode;
}

export const StatBlock: React.FC<StatBlockProps> = ({ 
  label, 
  value, 
  className = "",
  orientation = 'vertical',
  icon
}) => {
  const baseClasses = "bg-[#f5f5f5] dark:bg-black/20 p-3 rounded-lg text-left transition-all duration-200 hover:shadow-md";
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
