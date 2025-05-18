
import React from "react";
import PlayoffMatchCard from "./match-card/PlayoffMatchCard";
import type { PlayoffMatch, Team } from "@/types";

interface MatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  hasNextMatch: boolean;
}

/**
 * MatchCard component for rendering playoff match cards
 * This is now a thin wrapper around the PlayoffMatchCard component
 */
const MatchCard: React.FC<MatchCardProps> = (props) => {
  return <PlayoffMatchCard {...props} />;
};

export default MatchCard;
