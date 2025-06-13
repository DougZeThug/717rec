
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ranking } from "@/types";

interface FullRankingsSectionProps {
  rankings: Ranking[];
}

const FullRankingsSection: React.FC<FullRankingsSectionProps> = ({ rankings }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Full Team Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        {rankings.length > 0 ? (
          <div className="space-y-4">
            {rankings.map((ranking, index) => (
              <div key={ranking.teamId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">#{index + 1}</span>
                  <div>
                    <h3 className="font-semibold">{ranking.teamName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ranking.wins}-{ranking.losses} ({(ranking.winPercentage * 100).toFixed(1)}%)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">Games: {ranking.gamesWon}-{ranking.gamesLost}</p>
                  <p className="text-xs text-muted-foreground">
                    Game Win %: {(ranking.gameWinPercentage * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No team rankings available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FullRankingsSection;
