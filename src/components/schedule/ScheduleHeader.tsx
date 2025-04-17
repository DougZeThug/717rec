
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import ScheduleSearch from "./ScheduleSearch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface ScheduleHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onNewMatch: () => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  onNewMatch,
  selectedDate = new Date(),
  onDateSelect
}) => {
  const handleDateSelect = (date: Date | undefined) => {
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h1 className="text-3xl font-bold text-cornhole-navy">Schedule</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          {onDateSelect && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(selectedDate, 'PP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
          <Button 
            onClick={onNewMatch}
            className="bg-cornhole-navy hover:bg-cornhole-navy/90"
          >
            <Plus className="h-5 w-5 mr-1" />
            New Match
          </Button>
        </div>
      </div>
      <ScheduleSearch value={searchTerm} onChange={setSearchTerm} />
    </div>
  );
};

export default ScheduleHeader;
