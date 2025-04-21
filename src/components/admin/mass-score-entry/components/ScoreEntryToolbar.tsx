
import React from "react";
import { FilterState } from "../types";
import FilterBar from "../FilterBar";
import { motion } from "framer-motion";

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
  onClearFilters
}) => {
  return (
    <motion.div 
      className="w-full space-y-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <h3 className="text-lg font-semibold">Filter Matches</h3>
      <FilterBar
        filters={filters}
        brackets={brackets}
        onDateChange={onDateChange}
        onBracketChange={onBracketChange}
        onClearFilters={onClearFilters}
      />
    </motion.div>
  );
};

export default ScoreEntryToolbar;
