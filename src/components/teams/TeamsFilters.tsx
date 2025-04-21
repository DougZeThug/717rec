
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, FilterX } from "lucide-react";
import { Division } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const isMobile = useIsMobile();
  
  return (
    <div className="w-full sm:w-auto">
      <TooltipProvider>
        <Select value={selectedDivision} onValueChange={onDivisionChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-gray-400 
                dark:hover:border-gray-600 transition-colors rounded-md flex items-center gap-2 w-full sm:w-[220px] h-9 px-3 py-1">
                {isMobile ? (
                  <Filter size={16} />
                ) : (
                  <>
                    <Filter size={16} />
                    <SelectValue placeholder="Filter by Division" />
                  </>
                )}
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter Teams by Division</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent className="bg-white dark:bg-gray-800">
            <SelectItem value="all" className="text-sm">All Divisions</SelectItem>
            <SelectItem value="unassigned" className="text-sm">Unassigned Division</SelectItem>
            {divisions.map(division => (
              <SelectItem key={division.id} value={division.id} className="text-sm">
                {division.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TooltipProvider>
    </div>
  );
};
