import { Filter } from 'lucide-react';
import React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Division } from '@/types';

interface TeamsFiltersProps {
  selectedDivision: string;
  onDivisionChange: (value: string) => void;
  divisions: Division[];
}

export const TeamsFilters: React.FC<TeamsFiltersProps> = ({
  selectedDivision,
  onDivisionChange,
  divisions,
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 sm:max-w-[220px]">
      <TooltipProvider>
        <Select value={selectedDivision} onValueChange={onDivisionChange}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger
                className="bg-card border-border
                hover:border-border/80 text-foreground transition-colors h-9 shadow-sm"
              >
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
            <SelectItem value="all" className="text-sm">
              All Divisions
            </SelectItem>
            <SelectItem value="unassigned" className="text-sm">
              Unassigned Division
            </SelectItem>
            {divisions.map((division) => (
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
