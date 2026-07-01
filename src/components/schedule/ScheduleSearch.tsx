import { Search } from 'lucide-react';
import React from 'react';

import { Input } from '@/components/ui/input';

interface ScheduleSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const ScheduleSearch: React.FC<ScheduleSearchProps> = ({ value, onChange }) => {
  return (
    <div className="relative w-full sm:w-64">
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="text"
        placeholder="Search matches"
        aria-label="Search matches"
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="
          pl-9 h-9 rounded-md text-sm font-inter tracking-wide
          border border-border dark:border-border
          placeholder:text-gray-400 placeholder:italic
          focus:border-cornhole-navy focus:outline-none 
          transition
        "
      />
    </div>
  );
};

export default ScheduleSearch;
