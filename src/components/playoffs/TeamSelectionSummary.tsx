
import React from "react";

interface Props { 
  count: number; 
  max: number; 
  minTeams?: number;
}

const TeamSelectionSummary: React.FC<Props> = ({ count, max, minTeams = 2 }) => (
  <div className="text-xs text-gray-500">
    Selected: {count} teams
    {max && ` (max: ${max})`}
    <br />
    <span className="text-blue-600">Teams ordered by current standings (seeding order)</span>
    {count > 0 && count < minTeams && (
      <p className="text-xs text-amber-500 mt-1">
        Please select at least {minTeams} teams to create a bracket
      </p>
    )}
    {count >= max && (
      <p className="text-xs text-blue-500 mt-1">
        Maximum team limit reached
      </p>
    )}
  </div>
);

export default TeamSelectionSummary;
