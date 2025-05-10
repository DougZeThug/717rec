
import React from "react";
import { AlertTriangle } from "lucide-react";

interface WarningDisplayProps {
  oddBlocks: number;
}

export const WarningDisplay: React.FC<WarningDisplayProps> = ({ oddBlocks }) => {
  if (oddBlocks === 0) return null;
  
  return (
    <div className="flex items-start gap-2 mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
      <div className="text-xs text-amber-800 dark:text-amber-300">
        <p className="font-medium">Odd number of teams detected</p>
        <p className="mt-1">Some time blocks have an odd number of teams, which means not all teams can be paired. Consider adding or removing teams to ensure an even number.</p>
      </div>
    </div>
  );
};
