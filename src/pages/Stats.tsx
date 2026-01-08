import React from "react";
import { useRankingsData } from "@/hooks/rankings/useRankingsData";
import StatsContainer from "@/components/stats/containers/StatsContainer";
import PageLayout from "@/components/layout/PageLayout";
import useScrollRestoration from "@/hooks/useScrollRestoration";

const Stats = () => {
  useScrollRestoration("/stats");
  const { latestMatches, matchesLoading, matchesError } = useRankingsData();

  return (
    <PageLayout>
      <StatsContainer 
        matches={latestMatches || []} 
        isLoadingMatches={matchesLoading} 
        matchesError={matchesError}
      />
    </PageLayout>
  );
};

export default Stats;
