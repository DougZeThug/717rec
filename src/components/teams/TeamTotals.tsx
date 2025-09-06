import React from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Award, Target, TrendingUp } from "lucide-react";
import { useTeamTotals } from "@/hooks/useTeamTotals";

interface TeamTotalsProps {
  teamId: string;
}

const TeamTotals: React.FC<TeamTotalsProps> = ({ teamId }) => {
  const { totals, isLoading } = useTeamTotals(teamId);

  if (isLoading) {
    return (
      <Card className="p-6 mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!totals) return null;

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Career Statistics</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">Career Record</span>
          <div className="font-mono text-lg font-medium text-foreground flex items-center">
            <Trophy size={16} className="text-emerald-500 mr-2" />
            {totals.career_match_wins}-{totals.career_match_losses}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">Career Games</span>
          <div className="font-mono text-lg font-medium text-foreground flex items-center">
            <Target size={16} className="text-blue-500 mr-2" />
            {totals.career_game_wins}-{totals.career_game_losses}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">Championships</span>
          <div className="font-mono text-lg font-medium text-foreground flex items-center">
            <Award size={16} className="text-yellow-500 mr-2" />
            {totals.championships || 0}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground">Runner-ups</span>
          <div className="font-mono text-lg font-medium text-foreground flex items-center">
            <TrendingUp size={16} className="text-orange-500 mr-2" />
            {totals.runner_ups || 0}
          </div>
        </div>
      </div>

      {totals.playoff_finishes && totals.playoff_finishes.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <span className="font-inter uppercase text-xs tracking-widest text-muted-foreground mb-3 block">
            Recent Playoff Finishes
          </span>
          <div className="flex flex-wrap gap-2">
            {totals.playoff_finishes.slice(0, 8).map((finish, index) => (
              <div
                key={index}
                className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground"
              >
                #{finish.rank}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TeamTotals;