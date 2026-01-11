import React from 'react';

import FilterBar from '../FilterBar';
import { FilterState } from '../types';

interface ScoreEntryToolbarProps {
  filters: FilterState;
  brackets: { id: string; title: string }[];
  onDateChange: (date?: Date) => void;
  onBracketChange: (bracketId?: string) => void;
  onClearFilters: () => void;
}

const ScoreEntryToolbar: React.FC<ScoreEntryToolbarProps> = ({
  filters,
  brackets,
  onDateChange,
  onBracketChange,
  onClearFilters,
}) => {
  return (
    <div className="w-full">
      <FilterBar
        filters={filters}
        brackets={brackets}
        onDateChange={onDateChange}
        onBracketChange={onBracketChange}
        onClearFilters={onClearFilters}
      />
    </div>
  );
};

export default ScoreEntryToolbar;
