
import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

interface TeamsHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

const TeamsHeader: React.FC<TeamsHeaderProps> = ({ title, description, children }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-800/70">
      <div>
        <h1 className={cn(
          "font-bebas text-3xl md:text-4xl tracking-wide uppercase",
          "bg-gradient-to-br from-blue-600 to-amber-500 bg-clip-text text-transparent",
          "dark:from-blue-400 dark:to-amber-300"
        )}>
          {title}
        </h1>
        {description && (
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 mt-2 sm:mt-0 w-full sm:w-auto ml-auto sm:ml-0">
        {children}
      </div>
    </div>
  );
};

export default TeamsHeader;
