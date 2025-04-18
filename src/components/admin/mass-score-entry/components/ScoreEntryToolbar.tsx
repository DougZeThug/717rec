
import React from "react";
import { CardTitle } from "@/components/ui/card";
import { TableProperties } from "lucide-react";
import FilterBar from "../FilterBar";
import { FilterState } from "../types";

interface ScoreEntryToolbarProps {
  filters: FilterState;
  brackets: { id: string; title: string; }[];
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
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <CardTitle className="flex items-center gap-2">
        <TableProperties size={20} />
        Mass Score Entry
      </CardTitle>

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
