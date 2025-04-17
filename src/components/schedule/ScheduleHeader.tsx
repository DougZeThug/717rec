
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ScheduleSearch from "./ScheduleSearch";

interface ScheduleHeaderProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onNewMatch: () => void;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  onNewMatch 
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-cornhole-navy mb-4 md:mb-0">Schedule</h1>
      
      <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
        <ScheduleSearch 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
        />
        
        <Button 
          onClick={onNewMatch}
          className="bg-cornhole-green hover:bg-cornhole-green/90"
        >
          <Plus className="h-4 w-4 mr-2" /> New Match
        </Button>
      </div>
    </div>
  );
};

export default ScheduleHeader;
