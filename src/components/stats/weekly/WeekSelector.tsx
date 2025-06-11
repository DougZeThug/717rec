
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useWeeklyDigest } from '@/hooks/weekly';

interface WeekSelectorProps {
  selectedWeek?: string;
  onWeekChange: (week: string) => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ selectedWeek, onWeekChange }) => {
  const { data: weeklyDigests, isLoading } = useWeeklyDigest();

  if (isLoading || !weeklyDigests?.length) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-sm">Loading weeks...</span>
      </div>
    );
  }

  const formatWeekLabel = (weekOf: string) => {
    const date = new Date(weekOf);
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 6);
    
    return `${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })} - ${endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}`;
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedWeek || weeklyDigests[0]?.week_of} onValueChange={onWeekChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select week" />
        </SelectTrigger>
        <SelectContent>
          {weeklyDigests.map((digest) => (
            <SelectItem key={digest.week_of} value={digest.week_of}>
              {formatWeekLabel(digest.week_of)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default WeekSelector;
