import React, { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface TeamsHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

const TeamsHeader: React.FC<TeamsHeaderProps> = ({ title, description, children }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-3 pb-2 sm:pb-4 border-b border-gray-200 dark:border-gray-800/70">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <h1
          className={cn(
            'font-bebas text-2xl sm:text-3xl md:text-4xl tracking-wide uppercase',
            'bg-gradient-to-br from-blue-600 to-amber-500 bg-clip-text text-transparent',
            'dark:from-blue-400 dark:to-amber-300',
            'heading-winter'
          )}
        >
          {title}
        </h1>
        {children}
      </div>
      {description && (
        <p className="hidden sm:block text-sm md:text-base text-gray-600 dark:text-gray-300">
          {description}
        </p>
      )}
    </div>
  );
};

export default TeamsHeader;
