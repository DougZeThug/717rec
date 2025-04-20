
import React from "react";

interface TeamDisplayProps {
  team: {
    name?: string;
    logoUrl?: string;
  };
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({ team }) => {
  return (
    <div className="flex items-center gap-2">
      {team.logoUrl && (
        <img
          src={team.logoUrl}
          alt=""
          className="h-6 w-6 rounded-full object-cover"
        />
      )}
      <span className="font-medium">{team.name || "TBD"}</span>
    </div>
  );
};

export default TeamDisplay;
