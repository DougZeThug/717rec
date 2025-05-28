
import React from "react";
import AdminView from "@/components/playoffs/views/AdminView";
import PlayoffView from "@/components/playoffs/views/PlayoffView";
import { PlayoffBracket, Team } from "@/types/playoffs";
import { PlayoffPageData } from "../hooks/usePlayoffPageData";
import { PlayoffHandlers } from "../hooks/usePlayoffHandlers";
import { PlayoffViewState } from "../hooks/usePlayoffViewState";

interface LocalBracketRendererProps {
  data: PlayoffPageData;
  view: PlayoffViewState;
  handlers: PlayoffHandlers;
}

export const LocalBracketRenderer: React.FC<LocalBracketRendererProps> = ({
  data,
  view,
  handlers
}) => {
  return (
    <>
      {/* Admin View with Tabs */}
      {data.bracket && data.isAdmin && (
        <AdminView
          activeTab={view.activeTab}
          setActiveTab={view.setActiveTab}
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
        />
      )}
      
      {/* Regular View */}
      {(!data.bracket || !data.isAdmin) && (
        <PlayoffView
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
        />
      )}
    </>
  );
};
