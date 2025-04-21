
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
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
    <div className="flex-1 sm:max-w-[220px]">
      <TooltipProvider>
        <Select value={selectedDivision} onValueChange={onDivisionChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 
                hover:border-gray-400 dark:hover:border-gray-600 transition-colors h-9">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="shrink-0" />
                  {!isMobile && <SelectValue placeholder="Filter by Division" />}
                </div>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter Teams by Division</p>
            </TooltipContent>
          </Tooltip>
          <SelectContent>
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
