
import React from "react";
import FullRankings from "../FullRankings";
import { Ranking } from "@/types";

interface FullRankingsSectionProps {
  rankings: Ranking[];
}

const FullRankingsSection = ({ rankings }: FullRankingsSectionProps) => {
  return <FullRankings rankings={rankings} />;
};

export default FullRankingsSection;
