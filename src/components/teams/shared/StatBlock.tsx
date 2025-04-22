
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
  // Stat labels: Inter, uppercase, xs-sm, tracking-widest
  const labelClasses = "font-inter uppercase tracking-widest text-xs text-gray-600 dark:text-gray-400";
  // Stat values: IBM Plex Mono, medium, scoreboard feel, right/center
  const valueClasses = orientation === 'horizontal'
    ? "font-mono text-base font-medium text-[#2c2c2c] dark:text-white text-right"
    : "font-mono text-base font-medium text-[#2c2c2c] dark:text-white text-center";

  const baseClasses = "bg-[#f5f5f5] dark:bg-black/20 p-2 rounded text-left";

  if (orientation === 'horizontal') {
    return (
      <div className={`${baseClasses} flex items-center justify-between ${className}`}>
        <span className={labelClasses}>{label}</span>
        <span className={valueClasses}>{value}</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} flex flex-col ${className}`}>
      <span className={labelClasses}>{label}</span>
      <span className={valueClasses}>{value}</span>
    </div>
  );
};
