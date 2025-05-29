
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

interface PlayoffHeaderProps {
  onCreateBracket: () => void;
}

const PlayoffHeader: React.FC<PlayoffHeaderProps> = ({ onCreateBracket }) => {
  return (
    <PageHeader 
      title="Playoffs" 
      description="Tournament brackets and playoff schedules"
      className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6"
    >
      <div className="flex space-x-3 mt-3 md:mt-0">
        <Button 
          onClick={onCreateBracket}
          className="bg-cornhole-green hover:bg-cornhole-green/90 min-h-11"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" /> New Bracket
        </Button>
      </div>
    </PageHeader>
  );
};

export default PlayoffHeader;
