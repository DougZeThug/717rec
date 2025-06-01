
import React from "react";
import PlayoffPageContent from "@/components/playoffs/PlayoffPageContent";
import { usePlayoffPageData } from "../hooks/usePlayoffPageData";
import { usePlayoffHandlers } from "../hooks/usePlayoffHandlers";
import { usePlayoffViewState } from "../hooks/usePlayoffViewState";

const PlayoffView: React.FC = () => {
  const data = usePlayoffPageData();
  const handlers = usePlayoffHandlers(data);
  const view = usePlayoffViewState(data, handlers);

  return (
    <PlayoffPageContent
      availableDivisions={data.availableDivisions}
      bracketsByDivision={data.typesafeBracketsByDivision}
      selectedBracketId={data.selectedBracketId}
      bracket={data.bracket}
      teams={data.teams}
      bracketLoading={data.isLoading}
      allBracketsData={data.allBracketsData}
      isLoading={data.isLoading}
      onCreateBracket={view.handleCreateBracket}
      onViewBracket={data.setSelectedBracketId}
      onEditBracket={view.handleCreateBracket}
      onEditMatch={handlers.handleEditMatchClick}
      onDeleteBracket={data.isAdmin ? view.handleDeleteBracket : undefined}
      onRefreshData={data.refetchBrackets}
    />
  );
};

export default PlayoffView;
