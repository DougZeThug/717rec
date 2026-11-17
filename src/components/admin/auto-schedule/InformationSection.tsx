import { HelpCircle } from 'lucide-react';
import React from 'react';

/**
 * Provides helpful information about how auto-scheduling works
 */
const InformationSection: React.FC = () => {
  return (
    <div className="text-xs text-muted-foreground mt-4 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center gap-1.5 mb-1.5">
        <HelpCircle className="size-3.5" />
        <h4 className="font-medium">How Auto-scheduling Works:</h4>
      </div>

      <ul className="list-disc pl-5 space-y-1">
        <li>
          Teams are matched by division first. With Prioritize Match Quality ON (Standard mode), a
          close power score and record are preferred next
        </li>
        <li>Algorithm avoids pairing teams that have already played against each other</li>
        <li>
          A pair from the same division scores highest, then a pair from neighbouring divisions
        </li>
        <li>
          Standard mode stops on a time block with an odd number of teams (3 or more): move a team,
          or use Dual Match Mode. A team alone in its block is shown as unmatched
        </li>
        <li>Match quality scores help identify the most balanced pairings</li>
      </ul>
    </div>
  );
};

export default InformationSection;
