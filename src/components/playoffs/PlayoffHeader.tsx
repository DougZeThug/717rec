
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

interface PlayoffHeaderProps {
  onCreateBracket: () => void;
  onOpenTeamDialog: () => void;
}

const PlayoffHeader: React.FC<PlayoffHeaderProps> = ({ onCreateBracket, onOpenTeamDialog }) => {
  return (
    <PageHeader 
      title="Playoffs" 
      description="Tournament brackets and playoff schedules"
      className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6"
    >
      <div className="flex space-x-3 mt-3 md:mt-0">
        <Button 
          onClick={onOpenTeamDialog}
          variant="outline"
          className="border-cornhole-navy text-cornhole-navy hover:bg-cornhole-navy hover:text-white min-h-11"
          size="sm"
        >
          <Users className="h-4 w-4 mr-2" /> Manage Team Divisions
        </Button>
        
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
