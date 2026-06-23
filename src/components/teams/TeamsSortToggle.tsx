import { ArrowDownAZ, ListOrdered } from 'lucide-react';
import React, { useCallback } from 'react';

import { Button } from '@/components/ui/button';

export type SortMode = 'rank' | 'alpha';

const SORT_MODES = [
  { key: 'rank', label: 'Rank', icon: ListOrdered },
  { key: 'alpha', label: 'A–Z', icon: ArrowDownAZ },
] as const;

interface TeamsSortToggleProps {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
}

interface SortModeButtonProps {
  mode: (typeof SORT_MODES)[number];
  isActive: boolean;
  setSortMode: (mode: SortMode) => void;
}

const SortModeButton: React.FC<SortModeButtonProps> = ({ mode, isActive, setSortMode }) => {
  const { key, label, icon: Icon } = mode;

  const handleClick = useCallback(() => {
    setSortMode(key);
  }, [key, setSortMode]);

  return (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      aria-pressed={isActive}
      onClick={handleClick}
      className={`flex items-center px-2 py-1 rounded-md transition-all duration-200 gap-1 ${
        isActive ? '' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
      style={{ minWidth: 74 }}
    >
      <Icon size={16} className="mr-1" />
      {label}
    </Button>
  );
};

const TeamsSortToggle: React.FC<TeamsSortToggleProps> = ({ sortMode, setSortMode }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-sm font-semibold text-muted-foreground mr-1">Sort by:</span>
    <div className="inline-flex rounded-lg bg-muted p-0.5 shadow-sm border border-border">
      {SORT_MODES.map((mode) => (
        <SortModeButton
          key={mode.key}
          mode={mode}
          isActive={sortMode === mode.key}
          setSortMode={setSortMode}
        />
      ))}
    </div>
  </div>
);

export default TeamsSortToggle;
