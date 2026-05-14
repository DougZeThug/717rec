import { Filter } from 'lucide-react';
import React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Division } from '@/types';

interface StatsHeaderProps {
  onDivisionChange: (value: string) => void;
  divisions: Division[];
}

const StatsHeader = ({ onDivisionChange, divisions }: StatsHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <h1 className="text-3xl font-bold text-cornhole-navy dark:text-white">Team Statistics</h1>

      <div className="flex items-center gap-2">
        <Filter size={18} className="text-muted-foreground dark:text-muted-foreground" />
        <div className="w-[180px]">
          <Select onValueChange={onDivisionChange} defaultValue="all">
            <SelectTrigger className="dark:bg-card dark:border-border dark:text-foreground dark:hover:bg-gray-700 dark:hover:border-gray-600 shadow-sm">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent className="dark:bg-card dark:border-border">
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions &&
                divisions.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default StatsHeader;
