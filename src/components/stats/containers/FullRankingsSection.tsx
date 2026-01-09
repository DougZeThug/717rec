import React from "react";
import FullRankings from "../FullRankings";
import { Ranking } from "@/types";

interface FullRankingsSectionProps {
  rankings: Ranking[];
  myTeamId?: string | null;
}

const FullRankingsSection = ({ rankings, myTeamId }: FullRankingsSectionProps) => {
  return <FullRankings rankings={rankings} myTeamId={myTeamId} />;
};

export default FullRankingsSection;
