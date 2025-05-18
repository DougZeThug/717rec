
import React from "react";
import { PlayoffMatch, Team } from "@/types";
import RoundColumn from "../RoundColumn";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface BracketSectionProps {
  title: string;
  matches: PlayoffMatch[][];
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  getVerticalSpacing: (roundIndex: number) => number;
  getNextMatch: (match: PlayoffMatch) => PlayoffMatch | null;
  connectorPaths: string[];
  className?: string;
}

/**
 * Component for rendering a section of a bracket (winners, losers, or finals)
 * Includes title, columns of matches, and SVG connectors
 */
const BracketSection: React.FC<BracketSectionProps> = ({
  title,
  matches,
  teams,
  onEditMatch,
  getVerticalSpacing,
  getNextMatch,
  connectorPaths,
  className
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <div className={cn("relative", className)}>
      <h3 className="text-lg font-bold mb-4 text-center">{title}</h3>
      <div className="flex space-x-16 relative">
        {matches.map((roundMatches, roundIndex) => (
          <RoundColumn
            key={`${title.toLowerCase()}-${roundIndex}`}
            round={String(roundIndex + 1)}
            type={title.toLowerCase().replace(" ", "-") as "winners" | "losers" | "finals"}
            matches={roundMatches}
            teams={teams}
            onEditMatch={onEditMatch}
            verticalSpacing={getVerticalSpacing(roundIndex)}
            roundIndex={roundIndex}
            getNextMatch={getNextMatch}
          />
        ))}
        
        {/* SVG layer for bracket connectors */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ overflow: 'visible' }}
        >
          {connectorPaths.map((path, i) => (
            <path
              key={`${title.toLowerCase()}-connector-${i}`}
              d={path}
              fill="none"
              stroke={isLight ? "#9ca3af" : "#6b7280"}
              strokeWidth="2"
              className="transition-colors duration-300"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default BracketSection;
