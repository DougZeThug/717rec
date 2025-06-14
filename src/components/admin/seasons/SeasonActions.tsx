
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Trophy } from "lucide-react";
import SeasonActivationDialog from "./SeasonActivationDialog";
import SeasonArchivalDialog from "./SeasonArchivalDialog";

interface SeasonActionsProps {
  season: any;
}

const SeasonActions: React.FC<SeasonActionsProps> = ({ season }) => {
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showArchivalDialog, setShowArchivalDialog] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Badge variant="default" className="bg-green-500">
        Current Active Season
      </Badge>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowArchivalDialog(true)}
        className="flex items-center gap-1"
      >
        <Archive className="h-3 w-3" />
        Archive Season
      </Button>

      <SeasonActivationDialog
        isOpen={showActivationDialog}
        onClose={() => setShowActivationDialog(false)}
        season={season}
      />

      <SeasonArchivalDialog
        isOpen={showArchivalDialog}
        onClose={() => setShowArchivalDialog(false)}
        season={season}
      />
    </div>
  );
};

export default SeasonActions;
