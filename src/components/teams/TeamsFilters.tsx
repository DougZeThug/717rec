
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { Division } from "@/types";

interface TeamsFiltersProps {
  selectedDivision: string;
  onDivisionChange: (value: string) => void;
  divisions: Division[];
}

export const TeamsFilters: React.FC<TeamsFiltersProps> = ({ 
  selectedDivision, 
  onDivisionChange,
  divisions
}) => {
  return (
    <div className="w-full sm:w-auto">
      <Select value={selectedDivision} onValueChange={onDivisionChange}>
        <SelectTrigger className="bg-white border-gray-300 hover:border-gray-400 transition-colors rounded-md flex items-center gap-2 w-full sm:w-[220px]">
          <Filter size={16} />
          <SelectValue placeholder="Filter by Division" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="all" className="text-sm">All Divisions</SelectItem>
          <SelectItem value="unassigned" className="text-sm">Unassigned Division</SelectItem>
          {divisions.map(division => (
            <SelectItem key={division.id} value={division.id} className="text-sm">
              {division.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
