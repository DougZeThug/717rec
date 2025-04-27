
import React from "react";

interface TeamDisplayProps {
  team: {
    name?: string;
    logoUrl?: string;
  };
  align?: "left" | "right" | "center";
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({ team, align = "left" }) => {
  const containerClassName = `flex items-center gap-2 ${
    align === "right" ? "flex-row-reverse" : "flex-row"
  }`;

  return (
    <div className={containerClassName}>
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
