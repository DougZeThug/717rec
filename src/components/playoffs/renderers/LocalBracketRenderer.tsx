
import React from "react";
import GlootBracket from "@/components/playoffs/GlootBracket";
import { PlayoffBracket, PlayoffTeam } from "@/utils/playoffs/playoffTypes";

interface LocalBracketRendererProps {
  bracket: PlayoffBracket;
  teams: PlayoffTeam[];
  // Accept and ignore any extra legacy props so TypeScript stops complaining
  [key: string]: any;
}

export const LocalBracketRenderer: React.FC<LocalBracketRendererProps> = ({
  bracket,
  teams,
  ...props
}) => {
  if (!bracket) {
    return (
      <div className="text-center p-8">
        <p className="text-lg font-medium text-gray-700">No bracket data available</p>
      </div>
    );
  }

  return (
    <GlootBracket
      bracket={bracket}
      teams={teams}
      onEditMatch={props.onEditMatch}
    />
  );
};
