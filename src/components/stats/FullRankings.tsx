
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RankingsTable from "./RankingsTable";
import { Ranking } from "@/types";

interface FullRankingsProps {
  rankings: Ranking[];
}

const FullRankings: React.FC<FullRankingsProps> = ({ rankings }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Team Rankings</CardTitle>
        <CardDescription>
          Based on opponent-weighted win percentage, strength of schedule (SOS), and game-level performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RankingsTable rankings={rankings} />
      </CardContent>
    </Card>
  );
};

export default FullRankings;
