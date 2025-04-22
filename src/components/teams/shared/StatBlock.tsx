
import React from "react";

interface StatBlockProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export const StatBlock: React.FC<StatBlockProps> = ({ 
  label, 
  value, 
  className = "",
  orientation = 'vertical'
}) => {
  const baseClasses = "bg-[#f5f5f5] dark:bg-black/20 p-2 rounded text-left";
  const labelClasses = "font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400";
  const valueClasses = "font-mono text-base font-medium text-[#2c2c2c] dark:text-white";

  if (orientation === 'horizontal') {
    return (
      <div className={`${baseClasses} flex items-center justify-between ${className}`}>
        <span className={labelClasses}>{label}</span>
        <span className={valueClasses} style={{textAlign:'right'}}>{value}</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} flex flex-col ${className}`}>
      <span className={labelClasses}>{label}</span>
      <span className={`${valueClasses} text-center`}>{value}</span>
    </div>
  );
};
