
import React from "react";
import { HelpCircle } from "lucide-react";

/**
 * Provides helpful information about how auto-scheduling works
 */
const InformationSection: React.FC = () => {
  return (
    <div className="text-xs text-muted-foreground mt-4 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center gap-1.5 mb-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        <h4 className="font-medium">How Auto-scheduling Works:</h4>
      </div>
      
      <ul className="list-disc pl-5 space-y-1">
        <li>Teams are matched based on skill levels using power scores and win records</li>
        <li>Algorithm avoids pairing teams that have already played against each other</li>
        <li>Matches are optimized to be as competitive and fair as possible</li>
        <li>Time blocks with odd numbers will have some teams unmatched</li>
        <li>Match quality scores help identify the most balanced pairings</li>
      </ul>
    </div>
  );
};

export default InformationSection;
