
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

interface PlayoffHeaderProps {
  onCreateBracket: () => void;
  onOpenTeamDialog: () => void;
}

const PlayoffHeader: React.FC<PlayoffHeaderProps> = ({ onCreateBracket, onOpenTeamDialog }) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-cornhole-navy mb-4 md:mb-0">Playoffs</h1>
      
      <div className="flex space-x-3">
        <Button 
          onClick={onOpenTeamDialog}
          variant="outline"
          className="border-cornhole-navy text-cornhole-navy hover:bg-cornhole-navy hover:text-white"
        >
          <Users className="h-4 w-4 mr-2" /> Manage Team Divisions
        </Button>
        
        <Button 
          onClick={onCreateBracket}
          className="bg-cornhole-green hover:bg-cornhole-green/90"
        >
          <Plus className="h-4 w-4 mr-2" /> New Bracket
        </Button>
      </div>
    </div>
  );
};

export default PlayoffHeader;
