
import React from "react";

const InformationSection: React.FC = () => {
  return (
    <div className="text-xs text-muted-foreground mt-2">
      <h4 className="font-medium mb-1">How Auto-scheduling Works:</h4>
      <ul className="list-disc pl-5 space-y-1">
        <li>Teams are matched based on skill levels using power scores and win records</li>
        <li>Algorithm avoids pairing teams that have already played against each other</li>
        <li>Matches are optimized to be as competitive and fair as possible</li>
        <li>Time blocks with odd numbers will have some teams unmatched</li>
      </ul>
    </div>
  );
};

export default InformationSection;
