
import React from "react";
import { BracketFormTeamsContainer } from "./bracket-teams/components";
import { BracketFormTeamsProps } from "./bracket-teams/types";

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = (props) => {
  // Minimum team requirement
  const minTeams = 2;
  
  return (
    <BracketFormTeamsContainer
      {...props}
      minTeams={minTeams}
    />
  );
};

export type { BracketFormTeamsProps };
