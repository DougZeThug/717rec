
import React from 'react';
import { Button } from "@/components/ui/button";
import { ListOrdered, ArrowDownAZ } from "lucide-react";

export type SortMode = 'rank' | 'alpha';

const SORT_MODES = [
  { key: 'rank', label: 'Rank', icon: ListOrdered },
  { key: 'alpha', label: 'A–Z', icon: ArrowDownAZ }
] as const;

interface TeamsSortToggleProps {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
}

const TeamsSortToggle: React.FC<TeamsSortToggleProps> = ({ sortMode, setSortMode }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-sm font-semibold text-muted-foreground mr-1">Sort by:</span>
    <div className="inline-flex rounded-lg bg-muted p-0.5 shadow-sm dark:bg-gray-800 dark:border dark:border-gray-700">
      {SORT_MODES.map(({ key, label, icon: Icon }) => (
        <Button
          variant={sortMode === key ? "default" : "ghost"}
          size="sm"
          aria-pressed={sortMode === key}
          key={key}
          onClick={() => setSortMode(key as SortMode)}
          className={`flex items-center px-2 py-1 rounded-md transition-colors gap-1 ${
            sortMode === key 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-muted-foreground/10 dark:text-gray-300 dark:hover:text-white"
          }`}
          style={{ minWidth: 74 }}
        >
          <Icon size={16} className="mr-1" />
          {label}
        </Button>
      ))}
    </div>
  </div>
);

export default TeamsSortToggle;
