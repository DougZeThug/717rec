
import React from "react";
import { PlayoffLoadingView } from "@/components/playoffs/layout/PlayoffLoadingView";
import { ChallongeBracketRenderer } from "@/components/playoffs/renderers/ChallongeBracketRenderer";
import { LocalBracketRenderer } from "@/components/playoffs/renderers/LocalBracketRenderer";
import PlayoffPageLayout from "@/components/playoffs/layout/PlayoffPageLayout";
import { usePlayoffPageData } from "@/components/playoffs/hooks/usePlayoffPageData";
import { usePlayoffHandlers } from "@/components/playoffs/hooks/usePlayoffHandlers";
import { usePlayoffViewState } from "@/components/playoffs/hooks/usePlayoffViewState";

const Playoffs = () => {
  // Use extracted hooks for data, handlers, and view state
  const data = usePlayoffPageData();
  const handlers = usePlayoffHandlers(data);
  const view = usePlayoffViewState(data, handlers);

  // Handle Challonge bracket display
  if (data.bracket?.challonge_tournament_id) {
    if (data.challongeBracket.isLoading || !data.challongeBracket.matches || !data.challongeBracket.participants) {
      return (
        <PlayoffPageLayout data={data} view={view} handlers={handlers}>
          <PlayoffLoadingView label="Loading Challonge tournament..." />
        </PlayoffPageLayout>
      );
    }

    return (
      <PlayoffPageLayout data={data} view={view} handlers={handlers}>
        <ChallongeBracketRenderer
          matches={data.challongeBracket.matches}
          participants={data.challongeBracket.participants}
        />
      </PlayoffPageLayout>
    );
  }

  return (
    <PlayoffPageLayout data={data} view={view} handlers={handlers}>
      <LocalBracketRenderer data={data} view={view} handlers={handlers} />
    </PlayoffPageLayout>
  );
};

export default Playoffs;
