import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Helmet } from "react-helmet-async";
import { useTeamsQuery } from "@/hooks/teams";
import { useTeamComparison } from "@/hooks/useTeamComparison";
import { TeamCompareSelector } from "@/components/compare/TeamCompareSelector";
import { TeamComparisonView } from "@/components/compare/TeamComparisonView";
import { Team } from "@/types";
import LoadingState from "@/components/ui/loading-state";
import { Scale } from "lucide-react";

const Compare: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: teams, isLoading: teamsLoading } = useTeamsQuery();
  
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);

  // Initialize from URL params
  useEffect(() => {
    if (!teams || teams.length === 0) return;

    const team1Id = searchParams.get("team1");
    const team2Id = searchParams.get("team2");

    if (team1Id && !team1) {
      const found = teams.find((t) => t.id === team1Id);
      if (found) setTeam1(found);
    }
    if (team2Id && !team2) {
      const found = teams.find((t) => t.id === team2Id);
      if (found) setTeam2(found);
    }
  }, [teams, searchParams]);

  // Sync selection to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (team1) params.set("team1", team1.id);
    if (team2) params.set("team2", team2.id);
    setSearchParams(params, { replace: true });
  }, [team1, team2, setSearchParams]);

  const { team1: comparison1, team2: comparison2, headToHead, isLoading: comparisonLoading } = useTeamComparison(team1, team2);

  const handleSwap = () => {
    setTeam1(team2);
    setTeam2(team1);
  };

  if (teamsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading teams..." />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Team Comparison | Volleyball League</title>
        <meta name="description" content="Compare two volleyball teams side by side with detailed statistics and head-to-head records" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Scale className="h-7 w-7 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Team Comparison</h1>
        </div>

        {/* Team Selectors */}
        <div className="mb-8">
          <TeamCompareSelector
            teams={teams || []}
            team1={team1}
            team2={team2}
            onTeam1Change={setTeam1}
            onTeam2Change={setTeam2}
            onSwap={handleSwap}
          />
        </div>

        {/* Comparison Content */}
        {!team1 && !team2 && (
          <div className="text-center py-16">
            <Scale className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">Select Teams to Compare</h2>
            <p className="text-muted-foreground">
              Choose two teams from the dropdowns above to see a detailed comparison
            </p>
          </div>
        )}

        {(team1 || team2) && (!team1 || !team2) && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Select {!team1 ? "the first" : "the second"} team to start comparing
            </p>
          </div>
        )}

        {team1 && team2 && comparisonLoading && (
          <div className="flex items-center justify-center py-16">
            <LoadingState message="Loading comparison..." />
          </div>
        )}

        {team1 && team2 && comparison1 && comparison2 && !comparisonLoading && (
          <TeamComparisonView
            team1={comparison1}
            team2={comparison2}
            headToHead={headToHead}
          />
        )}
      </div>
    </>
  );
};

export default Compare;
