
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
    <Select value={selectedDivision} onValueChange={onDivisionChange}>
      <SelectTrigger className="w-[180px] flex items-center gap-2">
        <Filter size={16} />
        <SelectValue placeholder="Filter by Division" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Divisions</SelectItem>
        <SelectItem value="unassigned">Unassigned Division</SelectItem>
        {divisions.map(division => (
          <SelectItem key={division.id} value={division.id}>
            {division.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
