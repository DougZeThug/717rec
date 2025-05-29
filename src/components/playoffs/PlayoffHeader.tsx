
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PlayoffHeaderProps {
  onCreateBracket: () => void;
}

const PlayoffHeader: React.FC<PlayoffHeaderProps> = ({ onCreateBracket }) => {
  return (
    <div className="flex justify-end mb-4 md:mb-6">
      <Button 
        onClick={onCreateBracket}
        className="bg-cornhole-green hover:bg-cornhole-green/90 min-h-11"
        size="sm"
      >
        <Plus className="h-4 w-4 mr-2" /> New Bracket
      </Button>
    </div>
  );
};

export default PlayoffHeader;
