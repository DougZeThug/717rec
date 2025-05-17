
import React from "react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { animations } from "@/styles/design-system";

interface QuickScoreHeaderProps {
  team1Name: string;
  team2Name: string;
}

const QuickScoreHeader: React.FC<QuickScoreHeaderProps> = ({ team1Name, team2Name }) => {
  return (
    <DialogHeader className="text-left">
      <DialogTitle className={animations.scaleIn}>Quick Score Entry</DialogTitle>
      <DialogDescription className={animations.fadeIn} style={{ animationDelay: '0.1s' }}>
        Quickly enter the match score for {team1Name} vs {team2Name}
      </DialogDescription>
    </DialogHeader>
  );
};

export default React.memo(QuickScoreHeader);
